import { NextRequest } from "next/server";
import prisma from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ok, fail } from "@/server/lib/response";

/**
 * D-03: 피드 상세 조회 API
 *
 * 피드 상세와 작성자 요약, 키워드, 이미지, 댓글 수를 반환한다.
 * 활성(active) + 미만료 피드만 조회 가능. 차단 관계·banned 작성자는 404 처리.
 *
 * @route GET /api/feeds/:id
 *
 * @requires 인증 - 로그인 사용자만 (차단 관계 확인에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     feed: {
 *       feedId, text, status, createdAt, updatedAt, expiresAt, boostScore,
 *       author: { userId, nickname, gender, department, studentYear, bio, profileImages },
 *       keywords, images, commentCount
 *     }
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, users, user_profile_images 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-03 상세 스펙
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // URL에서 피드 ID 추출
    const feedId = Number(id); // 문자열 → 숫자 변환

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) { // 피드 ID가 정수가 아닌 경우
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const currentUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const feed = await prisma.selfDateFeed.findUnique({
      where: { id: feedId },
      select: {
        id: true,
        text: true,
        status: true,
        created_at: true,
        updated_at: true,
        expires_at: true,
        boost_score: true,
        author_user_id: true,
        author_user: { // 작성자 상세 정보
          select: {
            id: true,
            nickname: true,
            gender: true,
            department: true,
            student_year: true,
            bio: true,
            status: true,
            userProfileImages: { // 전체 프로필 이미지 목록
              orderBy: { sort_order: "asc" },
              select: { image_url: true, sort_order: true, is_primary: true },
            },
          },
        },
        keywords: { // 피드 키워드
          select: {
            feed_keyword: {
              select: { feed_keyword_id: true, name: true },
            },
          },
        },
        images: { // 피드 이미지 전체
          orderBy: { sort_order: "asc" },
          select: { id: true, image_url: true, sort_order: true },
        },
        _count: { select: { comments: true } }, // 댓글 수
      },
    });

    if (!feed) { // 피드가 존재하지 않는 경우
      return fail("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
    }

    if (feed.author_user.status === "suspended") { // banned(현재 스키마: suspended) 작성자의 피드 → 숨김
      return fail("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
    }

    if (feed.status !== "active") { // 삭제/만료/숨김 피드는 조회 불가
      return fail("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드입니다.");
    }

    const now = new Date();
    if (feed.expires_at <= now) { // 만료된 피드는 조회 불가
      return fail("FEED_NOT_AVAILABLE", "만료된 피드입니다.");
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
        return fail("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
      }
    }

    return ok({ // 성공 응답
      feed: {
        feedId: feed.id,
        text: feed.text,
        status: feed.status,
        createdAt: feed.created_at.toISOString(),
        updatedAt: feed.updated_at.toISOString(),
        expiresAt: feed.expires_at.toISOString(),
        boostScore: feed.boost_score,
        author: {
          userId: feed.author_user.id,
          nickname: feed.author_user.nickname,
          gender: feed.author_user.gender,
          department: feed.author_user.department,
          studentYear: feed.author_user.student_year,
          bio: feed.author_user.bio,
          profileImages: feed.author_user.userProfileImages.map((img) => ({ // 프로필 이미지 목록 변환
            imageUrl: img.image_url,
            sortOrder: img.sort_order,
            isPrimary: img.is_primary,
          })),
        },
        keywords: feed.keywords.map((k) => ({ // 키워드 목록 변환
          feedKeywordId: k.feed_keyword.feed_keyword_id,
          name: k.feed_keyword.name,
        })),
        images: feed.images.map((img) => ({ // 피드 이미지 목록 변환
          imageId: img.id,
          imageUrl: img.image_url,
          sortOrder: img.sort_order,
        })),
        commentCount: feed._count.comments,
      },
    });
  } catch (error) {
    console.error("[GET /api/feeds/:id]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "피드 상세를 불러오는 중 오류가 발생했습니다."); // 실패 응답
  }
}

/**
 * D-04: 피드 수정 API
 *
 * 활성 피드의 본문/키워드를 수정한다.
 * 본인 피드만 수정 가능. expires_at은 변경하지 않는다 (정책: "수정 할 수 있으나 유지 시간과는 독립").
 * 키워드 수정 시 기존 연결 삭제 → 새 키워드 연결 (전체 교체).
 *
 * @route PATCH /api/feeds/:id
 *
 * @requires 인증 - 로그인 사용자만 (본인 피드 검증에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 * @param text - 수정할 본문 (선택, string)
 * @param feedKeywordIds - 수정할 키워드 ID 배열 (선택, number[] — 전체 교체)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { updated: true }
 * }
 *
 * @returns 400 - 에러 (권한 없음, 피드 없음, 만료, 키워드 유효성 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, self_date_feed_keywords, feed_keywords 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-04 상세 스펙
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // URL에서 피드 ID 추출
    const feedId = Number(id); // 문자열 → 숫자 변환

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) { // 피드 ID가 정수가 아닌 경우
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    const body = await request.json(); // 요청 바디 파싱
    const { text, feedKeywordIds } = body as { text: unknown; feedKeywordIds: unknown };

    const hasText = text !== undefined; // 본문 수정 여부
    const hasKeywords = feedKeywordIds !== undefined; // 키워드 수정 여부

    if (!hasText && !hasKeywords) { // 수정할 내용이 없는 경우
      return fail("NO_UPDATE_FIELDS", "수정할 항목이 없습니다. text 또는 feedKeywordIds를 전달해주세요.");
    }

    if (hasText && (typeof text !== "string" || !text.trim())) { // 본문이 빈 값이거나 문자열이 아닌 경우
      return fail("INVALID_TEXT", "피드 본문은 빈 값이 아닌 문자열이어야 합니다.");
    }

    if (hasKeywords) { // 키워드 배열 검증
      if (!Array.isArray(feedKeywordIds) || feedKeywordIds.length === 0) { // 빈 배열이거나 배열이 아닌 경우
        return fail("INVALID_KEYWORDS", "피드 키워드 ID 배열은 1개 이상이어야 합니다.");
      }

      const hasInvalidId = (feedKeywordIds as unknown[]).some((kwId) => typeof kwId !== "number" || !Number.isInteger(kwId)); // 배열 내 모든 값이 정수인지 검증
      if (hasInvalidId) {
        return fail("INVALID_KEYWORD_ID", "피드 키워드 ID는 모두 정수여야 합니다.");
      }
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const currentUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const feed = await prisma.selfDateFeed.findUnique({ // 피드 존재 + 소유권 확인
      where: { id: feedId },
      select: { id: true, author_user_id: true, status: true, expires_at: true },
    });

    if (!feed) { // 피드가 존재하지 않는 경우
      return fail("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
    }

    if (feed.author_user_id !== currentUserId) { // 본인 피드가 아닌 경우
      return fail("FEED_NOT_OWNER", "본인이 작성한 피드만 수정할 수 있습니다.");
    }

    if (feed.status !== "active") { // 활성 상태가 아닌 피드는 수정 불가
      return fail("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드는 수정할 수 없습니다.");
    }

    const now = new Date();
    if (feed.expires_at <= now) { // 만료된 피드는 수정 불가
      return fail("FEED_NOT_AVAILABLE", "만료된 피드는 수정할 수 없습니다.");
    }

    if (hasKeywords) { // 키워드 유효성 검증 (수정 요청 시)
      const validKeywords = await prisma.feedKeyword.findMany({
        where: {
          feed_keyword_id: { in: feedKeywordIds as number[] },
          is_active: true,
        },
        select: { feed_keyword_id: true },
      });

      if (validKeywords.length !== (feedKeywordIds as number[]).length) { // 유효하지 않은 키워드 포함
        return fail("INVALID_KEYWORD_ID", "존재하지 않거나 비활성 상태인 키워드가 포함되어 있습니다.");
      }
    }

    await prisma.$transaction(async (tx) => { // 묶음 처리: 본문 수정 + 키워드 교체를 하나의 트랜잭션으로
      const updateData: Prisma.SelfDateFeedUpdateInput = { // 업데이트할 필드 구성
        updated_at: now,
      };
      if (hasText) updateData.text = (text as string).trim(); // 본문 수정

      await tx.selfDateFeed.update({ // 피드 본체 수정
        where: { id: feedId },
        data: updateData,
      });

      if (hasKeywords) { // 키워드 전체 교체: 기존 삭제 → 새로 연결
        await tx.selfDateFeedKeyword.deleteMany({ // 기존 키워드 연결 삭제
          where: { feed_id: feedId },
        });

        await tx.selfDateFeedKeyword.createMany({ // 새 키워드 연결 생성
          data: (feedKeywordIds as number[]).map((kwId) => ({
            feed_id: feedId,
            feed_keyword_id: kwId,
          })),
        });
      }

      // TODO: 이미지 교체 로직 추가 예정 (저장소 구현 후)
    });

    return ok({ updated: true }); // 성공 응답
  } catch (error) {
    console.error("[PATCH /api/feeds/:id]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "피드 수정 중 오류가 발생했습니다."); // 실패 응답
  }
}
