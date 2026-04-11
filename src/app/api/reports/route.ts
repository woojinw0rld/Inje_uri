import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * D-11: 공통 신고 API
 *
 * 프로필/피드/댓글/채팅방/메시지 신고를 공통 모델로 저장한다.
 * targetType에 따라 대상 테이블에서 존재 여부를 검증하고, reports 테이블에 기록한다.
 * alsoBlock = true이면 신고와 동시에 차단도 처리 (Prisma 묶음 처리 사용).
 *
 * @route POST /api/reports
 *
 * @requires 인증 - 로그인 사용자만 (reporter_user_id 필요)
 *
 * @param targetType - 신고 대상 종류 (필수, "user" | "feed" | "feed_comment" | "chat_room" | "message")
 * @param targetId - 신고 대상 ID (필수, number)
 * @param reasonType - 신고 유형 (필수, string)
 * @param description - 상세 설명 (선택, string)
 * @param alsoBlock - true이면 신고와 동시에 차단 (선택, boolean)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { reportId: number }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 대상 없음, 자기 신고 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see reports 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-11 상세 스펙
 */

const VALID_TARGET_TYPES = ["user", "feed", "feed_comment", "chat_room", "message"] as const; // 허용되는 신고 대상 종류
type TargetType = (typeof VALID_TARGET_TYPES)[number];

export async function POST(request: NextRequest) { // HTTP POST 메서드로 신고를 생성하는 API
  try {
    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { targetType, targetId, reasonType, description, alsoBlock } = body as {
      targetType: unknown;
      targetId: unknown;
      reasonType: unknown;
      description: unknown;
      alsoBlock: unknown;
    };

    if (typeof targetType !== "string" || !VALID_TARGET_TYPES.includes(targetType as TargetType)) { // targetType 유효성 검증
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TARGET_TYPE",
            message: `신고 대상 종류는 ${VALID_TARGET_TYPES.join(", ")} 중 하나여야 합니다.`,
          },
        },
        { status: 400 },
      );
    }

    if (typeof targetId !== "number" || !Number.isInteger(targetId)) { // targetId가 정수가 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TARGET_ID",
            message: "신고 대상 ID는 정수여야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    if (typeof reasonType !== "string" || !reasonType.trim()) { // reasonType이 빈 문자열이거나 문자열이 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REASON_TYPE",
            message: "신고 유형은 빈 값이 아닌 문자열이어야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    if (description !== undefined && typeof description !== "string") { // description이 있는데 문자열이 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DESCRIPTION",
            message: "상세 설명은 문자열이어야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const reporterUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const validatedType = targetType as TargetType; // 위에서 검증 완료된 targetType을 타입 단언

    const targetOwnerUserId = await findTargetOwnerUserId(validatedType, targetId, reporterUserId); // targetType별로 대상 존재 확인 + 소유자 사용자 ID 추출

    if (targetOwnerUserId === null) { // 대상이 존재하지 않으면 에러 반환
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TARGET_NOT_FOUND",
            message: "신고 대상이 존재하지 않습니다.",
          },
        },
        { status: 400 },
      );
    }

    if (targetOwnerUserId === reporterUserId) { // 자기 자신을 신고하려는 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CANNOT_REPORT_SELF",
            message: "자기 자신을 신고할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    if (alsoBlock) { // 신고 + 동시 차단: Prisma $transaction으로 묶음 처리
      const [report] = await prisma.$transaction([ // 신고 생성 + 차단 생성을 하나의 묶음으로 처리
        prisma.report.create({
          data: {
            reporter_user_id: reporterUserId,
            target_type: validatedType,
            target_id: targetId,
            reason_type: reasonType as string,
            description: (description as string | undefined) ?? null,
          },
          select: { id: true },
        }),
        prisma.block.upsert({ // 이미 차단되어 있으면 무시, 없으면 새로 생성
          where: {
            blocker_user_id_blocked_user_id: {
              blocker_user_id: reporterUserId,
              blocked_user_id: targetOwnerUserId,
            },
          },
          create: {
            blocker_user_id: reporterUserId,
            blocked_user_id: targetOwnerUserId,
            reason: `신고와 동시 차단 (${validatedType} #${targetId})`, // 차단 사유에 신고 정보 기록
          },
          update: {
            unblocked_at: null, // 이전에 해제된 차단이라면 다시 활성화
          },
        }),
      ]);

      return NextResponse.json({ // 신고 + 차단 성공 응답
        success: true,
        data: { reportId: report.id },
      });
    }

    const report = await prisma.report.create({ // 신고만 생성 (차단 없이)
      data: {
        reporter_user_id: reporterUserId,
        target_type: validatedType,
        target_id: targetId,
        reason_type: reasonType as string,
        description: (description as string | undefined) ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { reportId: report.id },
    });
  } catch (error) {
    console.error("[POST /api/reports]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "신고 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}

/**
 * targetType별 대상 존재 확인 + 소유자(사용자) ID 추출
 *
 * 신고 대상이 존재하면 해당 콘텐츠의 소유자 사용자 ID를 반환.
 * 존재하지 않으면 null 반환.
 * alsoBlock 시 차단 대상을 결정하는 데 사용.
 *
 * @param targetType - 신고 대상 종류
 * @param targetId - 신고 대상 ID
 * @param reporterUserId - 신고자 ID (chat_room에서 상대방 식별에 사용)
 * @returns 소유자 사용자 ID 또는 null
 */
async function findTargetOwnerUserId(
  targetType: TargetType,
  targetId: number,
  reporterUserId: number,
): Promise<number | null> {
  switch (targetType) {
    case "user": { // 사용자 신고 → targetId 자체가 사용자 ID
      const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      return user ? user.id : null;
    }
    case "feed": { // 피드 신고 → 피드 작성자의 사용자 ID
      const feed = await prisma.selfDateFeed.findUnique({
        where: { id: targetId },
        select: { author_user_id: true },
      });
      return feed ? feed.author_user_id : null;
    }
    case "feed_comment": { // 댓글 신고 → 댓글 작성자의 사용자 ID
      const comment = await prisma.feedComment.findUnique({
        where: { id: targetId },
        select: { commenter_user_id: true },
      });
      return comment ? comment.commenter_user_id : null;
    }
    case "chat_room": { // 채팅방 신고 → 채팅방 내 상대방 참가자의 사용자 ID
      const participant = await prisma.chatRoomParticipant.findFirst({
        where: {
          chat_room_id: targetId,
          user_id: { not: reporterUserId }, // 본인 제외한 상대방
        },
        select: { user_id: true },
      });
      return participant ? participant.user_id : null;
    }
    case "message": { // 메시지 신고 → 메시지 발신자의 사용자 ID
      const message = await prisma.message.findUnique({
        where: { id: targetId },
        select: { sender_user_id: true },
      });
      return message ? message.sender_user_id : null;
    }
    default:
      return null;
  }
}
