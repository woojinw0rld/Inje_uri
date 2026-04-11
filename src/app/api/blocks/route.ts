import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * D-12: 사용자 차단 API
 *
 * 사용자 간 차단 관계를 생성한다.
 * blocks 테이블에 차단 기록을 추가하며, 차단 즉시 피드/댓글 목록에서 해당 사용자 콘텐츠가 필터링된다.
 * 중복 방지 제약 (blocker_user_id, blocked_user_id) 으로 같은 관계가 두 번 들어가지 않는다.
 *
 * @route POST /api/blocks
 *
 * @requires 인증 - 로그인 사용자만 (blocker_user_id 필요)
 *
 * @param blockedUserId - 차단 대상 사용자 ID (필수, number)
 * @param reason - 차단 사유 (선택, string)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { blockId: number }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 자기 차단, 대상 없음, 이미 차단됨 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-12 상세 스펙
 */
export async function POST(request: NextRequest) { // HTTP POST 메서드로 사용자 차단 관계를 생성하는 API
  try {
    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { blockedUserId, reason } = body as { blockedUserId: unknown; reason: unknown }; // 차단 대상 ID + 사유 추출

    if (typeof blockedUserId !== "number" || !Number.isInteger(blockedUserId)) { // blockedUserId가 정수가 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_BLOCKED_USER_ID",
            message: "차단 대상 사용자 ID가 유효하지 않습니다.",
          },
        },
        { status: 400 },
      );
    }

    if (reason !== undefined && typeof reason !== "string") { // reason이 있는데 문자열이 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REASON",
            message: "차단 사유가 string이 아닙니다.",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const blockerUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    if (blockerUserId === blockedUserId) { // 자기 자신을 차단하려는 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CANNOT_BLOCK_SELF",
            message: "자기 자신을 차단할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({ // 차단 대상 사용자 존재 여부 확인 , findUnique는 고유값 조회, user_id는 고유값이므로 findUnique 사용 가능
      where: { id: blockedUserId },
      select: { id: true }, 
    });

    if (!targetUser) { // 대상 사용자가 없으면 에러 반환
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "존재하지 않는 사용자입니다.",
          },
        },
        { status: 400 },
      );
    }

    const existingBlock = await prisma.block.findUnique({ // 이미 차단된 관계인지 확인함
      where: {
        blocker_user_id_blocked_user_id: { // unique 제약 조건 (blocker_user_id + blocked_user_id)
          blocker_user_id: blockerUserId,
          blocked_user_id: blockedUserId,
        },
      },
      select: { id: true, unblocked_at: true },
    });

    if (existingBlock && !existingBlock.unblocked_at) { // 차단 중인 관계가 이미 존재하면 에러 반환
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_BLOCKED",
            message: "이미 차단한 사용자입니다.",
          },
        },
        { status: 400 },
      );
    }

    if (existingBlock && existingBlock.unblocked_at) { // 과거에 차단했다가 해제한 경우 → 다시 차단 (unblocked_at 초기화)
      const reblocked = await prisma.block.update({
        where: { id: existingBlock.id },
        data: {
          reason: reason as string | undefined ?? null, // 새 사유로 덮어쓰기 (없으면 null)
          unblocked_at: null, // 차단 해제 시각 초기화(NULL) → 다시 활성 차단 상태 / 차단 중 일 떈 null, 해체 중 일땐 timestamp / unblocked_at이 존재
        },
        select: { id: true },
      });

      return NextResponse.json({ // 재차단 성공 응답
        success: true,
        data: { blockId: reblocked.id },
      });
    }

    const block = await prisma.block.create({ // 신규 차단 생성 , 위 조건들 다 통과하면 = 차단 관계가 없음
      data: {
        blocker_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        reason: reason as string | undefined ?? null, // 사유가 없으면 null 저장
      },
      select: { id: true },
    });

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { blockId: block.id },
    });
  } catch (error) {
    console.error("[POST /api/blocks]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "차단 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}
