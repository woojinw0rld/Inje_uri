import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * D-06: 댓글 작성 API
 *
 * 피드에 댓글(=호감 표현)을 남긴다.
 * 활성(active) + 미만료 피드에만 작성 가능.
 * 1인 1댓글 (feed_id, commenter_user_id) 중복 방지.
 * 자기 피드에는 댓글 불가. 차단 관계 시 404 처리.
 *
 * @route POST /api/feeds/:id/comments
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @param id - URL 경로의 피드 ID
 * @param content - 댓글 본문 (필수, string)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { commentId: number }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see feed_comments, self_date_feeds, blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-06 상세 스펙
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // URL에서 피드 ID 추출
    const feedId = Number(id); // 문자열 → 숫자 변환

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) { // 피드 ID가 정수가 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FEED_ID",
            message: "유효하지 않은 피드 ID입니다.",
          },
        },
        { status: 400 },
      );
    }

    const body = await request.json(); // 요청 바디 파싱
    const { content } = body as { content: unknown };

    if (typeof content !== "string" || !content.trim()) { // 댓글 본문이 빈 값이거나 문자열이 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONTENT",
            message: "댓글 본문은 빈 값이 아닌 문자열이어야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const currentUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const feed = await prisma.selfDateFeed.findUnique({ // 피드 존재 + 상태 확인
      where: { id: feedId },
      select: { id: true, status: true, expires_at: true, author_user_id: true },
    });

    if (!feed) { // 피드가 존재하지 않는 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_FOUND",
            message: "존재하지 않는 피드입니다.",
          },
        },
        { status: 400 },
      );
    }

    if (feed.status !== "active") { // 활성 상태가 아닌 피드에는 댓글 불가
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_AVAILABLE",
            message: "활성 상태가 아닌 피드에는 댓글을 작성할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    const now = new Date();
    if (feed.expires_at <= now) { // 만료된 피드에는 댓글 불가
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_AVAILABLE",
            message: "만료된 피드에는 댓글을 작성할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    if (feed.author_user_id === currentUserId) { // 자기 피드에 댓글 작성 방지
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CANNOT_COMMENT_OWN_FEED",
            message: "본인의 피드에는 댓글을 작성할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    const blockExists = await prisma.block.findFirst({ // 차단 관계 확인 (양방향)
      where: {
        unblocked_at: null, // 활성 차단만
        OR: [
          { blocker_user_id: currentUserId, blocked_user_id: feed.author_user_id }, // 내가 차단한
          { blocker_user_id: feed.author_user_id, blocked_user_id: currentUserId }, // 나를 차단한
        ],
      },
      select: { id: true },
    });

    if (blockExists) { // 차단 관계면 피드 존재 자체를 숨김
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_FOUND",
            message: "존재하지 않는 피드입니다.",
          },
        },
        { status: 400 },
      );
    }

    const existingComment = await prisma.feedComment.findUnique({ // 1인 1댓글 중복 확인
      where: {
        feed_id_commenter_user_id: {
          feed_id: feedId,
          commenter_user_id: currentUserId,
        },
      },
      select: { id: true },
    });

    if (existingComment) { // 이미 댓글을 작성한 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMMENT_ALREADY_EXISTS",
            message: "이미 이 피드에 댓글을 작성했습니다.",
          },
        },
        { status: 400 },
      );
    }

    const comment = await prisma.feedComment.create({ // 댓글 생성
      data: {
        feed_id: feedId,
        commenter_user_id: currentUserId,
        content: content.trim(),
      },
      select: { id: true },
    });

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { commentId: comment.id },
    });
  } catch (error) {
    console.error("[POST /api/feeds/:id/comments]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "댓글 작성 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}

/**
 * D-05: 피드 댓글 목록 조회 API
 *
 * 특정 피드의 댓글 목록을 조회한다.
 * 삭제된 댓글(soft delete) 제외, banned 사용자 댓글 제외, 차단 관계 양방향 필터.
 * 피드 존재 + 접근 권한 검증 (D-03과 동일한 검증).
 *
 * @route GET /api/feeds/:id/comments
 *
 * @requires 인증 - 로그인 사용자만 (차단 필터에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{ commentId, content, createdAt, commenter: { userId, nickname, profileImage } }>
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see feed_comments, self_date_feeds, blocks, users 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-05 상세 스펙
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // URL에서 피드 ID 추출
    const feedId = Number(id); // 문자열 → 숫자 변환

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) { // 피드 ID가 정수가 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FEED_ID",
            message: "유효하지 않은 피드 ID입니다.",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const currentUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const feed = await prisma.selfDateFeed.findUnique({ // 피드 존재 + 상태 확인
      where: { id: feedId },
      select: { id: true, status: true, expires_at: true, author_user_id: true },
    });

    if (!feed) { // 피드가 존재하지 않는 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_FOUND",
            message: "존재하지 않는 피드입니다.",
          },
        },
        { status: 400 },
      );
    }

    if (feed.status !== "active") { // 활성 상태가 아닌 피드
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_AVAILABLE",
            message: "활성 상태가 아닌 피드입니다.",
          },
        },
        { status: 400 },
      );
    }

    const now = new Date();
    if (feed.expires_at <= now) { // 만료된 피드
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_AVAILABLE",
            message: "만료된 피드입니다.",
          },
        },
        { status: 400 },
      );
    }

    const isOwner = feed.author_user_id === currentUserId; // 본인 피드 여부

    if (!isOwner) { // 본인 피드가 아닐 때만 차단 관계 확인
      const blockExists = await prisma.block.findFirst({
        where: {
          unblocked_at: null, // 활성 차단만
          OR: [
            { blocker_user_id: currentUserId, blocked_user_id: feed.author_user_id }, // 내가 차단한
            { blocker_user_id: feed.author_user_id, blocked_user_id: currentUserId }, // 나를 차단한
          ],
        },
        select: { id: true },
      });

      if (blockExists) { // 차단 관계면 존재 자체를 숨김
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FEED_NOT_FOUND",
              message: "존재하지 않는 피드입니다.",
            },
          },
          { status: 400 },
        );
      }
    }

    const blockedRelations = await prisma.block.findMany({ // 차단 관계 조회: 댓글 작성자 필터용 (양방향)
      where: {
        unblocked_at: null, // 현재 활성 차단만
        OR: [
          { blocker_user_id: currentUserId },
          { blocked_user_id: currentUserId },
        ],
      },
      select: { blocker_user_id: true, blocked_user_id: true },
    });

    const blockedUserIds = new Set<number>(); // 차단된 사용자 ID 집합 (양방향)
    for (const block of blockedRelations) {
      if (block.blocker_user_id === currentUserId) blockedUserIds.add(block.blocked_user_id); // 내가 차단한 사용자
      if (block.blocked_user_id === currentUserId) blockedUserIds.add(block.blocker_user_id); // 나를 차단한 사용자
    }

    const comments = await prisma.feedComment.findMany({
      where: {
        feed_id: feedId,
        deleted_at: null, // 삭제된 댓글 제외 (soft delete)
        commenter_user: {
          status: { not: "suspended" }, // banned(현재 스키마: suspended) 사용자 댓글 제외
        },
        ...(blockedUserIds.size > 0 ? { commenter_user_id: { notIn: [...blockedUserIds] } } : {}), // 차단된 사용자 댓글 제외
      },
      orderBy: { created_at: "asc" }, // 오래된 순 (먼저 댓글 단 사람이 위)
      select: {
        id: true,
        content: true,
        created_at: true,
        commenter_user: { // 댓글 작성자 정보
          select: {
            id: true,
            nickname: true,
            userProfileImages: { // 대표 프로필 이미지
              where: { is_primary: true },
              select: { image_url: true },
              take: 1,
            },
          },
        },
      },
    });

    const items = comments.map((comment) => ({ // DB 응답 → 클라이언트 응답 형식 변환
      commentId: comment.id,
      content: comment.content,
      createdAt: comment.created_at.toISOString(),
      commenter: {
        userId: comment.commenter_user.id,
        nickname: comment.commenter_user.nickname,
        profileImage: comment.commenter_user.userProfileImages[0]?.image_url ?? null, // 대표 프로필 이미지 (없으면 null)
      },
    }));

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { items },
    });
  } catch (error) {
    console.error("[GET /api/feeds/:id/comments]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "댓글 목록을 불러오는 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}
