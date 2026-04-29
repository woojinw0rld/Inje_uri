import { NextRequest } from "next/server";
import prisma from "@/server/db/prisma";
import { getAuthUserId } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";

/**
 * D-07: 내가 댓글 단 피드 목록 API
 *
 * 내가 댓글을 남긴 피드와 댓글 정보를 함께 조회한다.
 * 삭제된 댓글 제외, 비활성 작성자 피드 제외, 차단 관계 피드 제외.
 * 최신순 정렬 (댓글 작성일 기준).
 *
 * @route GET /api/feeds/commented-by-me
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{
 *       comment: { commentId, content, createdAt },
 *       feed: { feedId, text, status, expiresAt, author: { userId, nickname, profileImage } }
 *     }>
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
 * @see Analysis/d-part-detail_v2.md - D-07 상세 스펙
 */
export async function GET(request: NextRequest) { // 내가 댓글 단 피드 목록을 조회하는 API
  try {
    const currentUserId = await getAuthUserId(request);

    const blockedRelations = await prisma.block.findMany({ // 차단 관계 조회 (양방향)
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
        commenter_user_id: currentUserId, // 내가 작성한 댓글만
        deleted_at: null, // 삭제된 댓글 제외
        feed: {
          author_user: {
            status: "active", // 비활성/벤/탈퇴 작성자 피드 제외
            deleted_at: null,
          },
          ...(blockedUserIds.size > 0 ? { author_user_id: { notIn: [...blockedUserIds] } } : {}), // 차단된 작성자 피드 제외
        },
      },
      orderBy: { created_at: "desc" }, // 최신순 (최근 댓글이 위)
      select: {
        id: true,
        content: true,
        created_at: true,
        feed: { // 댓글이 달린 피드 정보
          select: {
            id: true,
            text: true,
            status: true,
            expires_at: true,
            author_user: { // 피드 작성자 정보
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
        },
      },
    }) as Array<{
      id: number;
      content: string;
      created_at: Date;
      feed: {
        id: number;
        text: string;
        status: string;
        expires_at: Date;
        author_user: {
          id: number;
          nickname: string;
          userProfileImages: Array<{ image_url: string }>;
        };
      };
    }>;

    const items = comments.map((comment) => ({ // DB 응답 → 클라이언트 응답 형식 변환
      comment: {
        commentId: comment.id,
        content: comment.content,
        createdAt: comment.created_at.toISOString(),
      },
      feed: {
        feedId: comment.feed.id,
        text: comment.feed.text,
        status: comment.feed.status,
        expiresAt: comment.feed.expires_at.toISOString(),
        author: {
          userId: comment.feed.author_user.id,
          nickname: comment.feed.author_user.nickname,
          profileImage: comment.feed.author_user.userProfileImages[0]?.image_url ?? null, // 대표 프로필 이미지 (없으면 null)
        },
      },
    }));

    return ok({ items }); // 성공 응답
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.code, error.message);
    }

    console.error("[GET /api/feeds/commented-by-me]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "내 댓글 목록을 불러오는 중 오류가 발생했습니다."); // 실패 응답
  }
}
