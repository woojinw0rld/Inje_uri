import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const FEED_PAGE_SIZE = 20; // 피드 목록 한 페이지당 조회 개수

/**
 * D-01: 피드 목록 조회 API
 *
 * 피드 탭 목록을 최신순으로 조회한다.
 * 활성(active) + 미만료 피드만, 차단 관계 양방향 필터, banned(suspended) 사용자 제외.
 * 키워드 필터 + cursor 페이징 지원.
 *
 * @route GET /api/feeds
 *
 * @requires 인증 - 로그인 사용자만 (차단 필터에 사용자 ID 필요)
 *
 * @param keyword - 피드 키워드 이름 필터 (선택, query string)
 * @param cursor - 다음 목록 기준점 피드 ID (선택, query string)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{ feedId, text, status, createdAt, expiresAt, author, keywords, primaryImage, commentCount }>,
 *     nextCursor: number | null
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, blocks, feed_keywords 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-01 상세 스펙
 */
export async function GET(request: NextRequest) { // HTTP GET 메서드로 피드 목록을 조회하는 API
  try {
    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const currentUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const { searchParams } = new URL(request.url); // URL에서 쿼리 파라미터 추출
    const keyword = searchParams.get("keyword"); // 키워드 필터 (선택)
    const cursorParam = searchParams.get("cursor"); // 커서 (선택)

    const cursor = cursorParam ? Number(cursorParam) : null; // cursor 문자열 → 숫자 변환
    if (cursorParam && (Number.isNaN(cursor) || !Number.isInteger(cursor))) { // cursor가 있는데 정수가 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CURSOR",
            message: "cursor는 정수여야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const blockedRelations = await prisma.block.findMany({ // 차단 관계 조회: 내가 차단한 + 나를 차단한 사용자 모두 (양방향)
      where: {
        unblocked_at: null, // 현재 활성 차단만
        OR: [
          { blocker_user_id: currentUserId }, // 내가 차단한
          { blocked_user_id: currentUserId }, // 나를 차단한
        ],
      },
      select: { blocker_user_id: true, blocked_user_id: true },
    });

    const blockedUserIds = new Set<number>(); // 차단된 사용자 ID 집합 (양방향)
    for (const block of blockedRelations) {
      if (block.blocker_user_id === currentUserId) blockedUserIds.add(block.blocked_user_id); // 내가 차단한 사용자
      if (block.blocked_user_id === currentUserId) blockedUserIds.add(block.blocker_user_id); // 나를 차단한 사용자
    }

    const whereCondition: Prisma.SelfDateFeedWhereInput = { // where 조건을 사전 빌드 (타입 추론 보장)
      status: "active", // 활성 피드만
      expires_at: { gt: now }, // 미만료 피드만
      author_user: {
        status: { not: "suspended" }, // banned(현재 스키마: suspended) 사용자 피드 제외
      },
    };

    if (blockedUserIds.size > 0) whereCondition.author_user_id = { notIn: [...blockedUserIds] }; // 차단된 사용자 피드 제외

    if (keyword) { // 키워드 필터: 해당 키워드 이름을 가진 피드만
      whereCondition.keywords = {
        some: { feed_keyword: { name: keyword } },
      };
    }

    if (cursor) whereCondition.id = { lt: cursor }; // cursor 페이징: cursor보다 작은 ID만

    const feeds = await prisma.selfDateFeed.findMany({
      where: whereCondition,
      orderBy: [
        { boost_score: "asc" }, // boost_score 오름차순 (감점이 적은 게 위로)
        { id: "desc" }, // 최신순 (ID 내림차순)
      ],
      take: FEED_PAGE_SIZE + 1, // 1개 더 조회하여 다음 페이지 존재 여부 판단
      select: {
        id: true,
        text: true,
        status: true,
        created_at: true,
        expires_at: true,
        author_user: { // 작성자 정보
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
        keywords: { // 피드 키워드
          select: {
            feed_keyword: {
              select: { feed_keyword_id: true, name: true },
            },
          },
        },
        images: { // 대표 이미지 (sort_order 1번)
          orderBy: { sort_order: "asc" },
          select: { image_url: true },
          take: 1,
        },
        _count: { select: { comments: true } }, // 댓글 수
      },
    });

    const hasNextPage = feeds.length > FEED_PAGE_SIZE; // 다음 페이지 존재 여부
    const feedsToReturn = hasNextPage ? feeds.slice(0, FEED_PAGE_SIZE) : feeds; // 초과분 잘라내기

    const items = feedsToReturn.map((feed) => ({ // DB 응답 → 클라이언트 응답 형식 변환
      feedId: feed.id,
      text: feed.text,
      status: feed.status,
      createdAt: feed.created_at.toISOString(),
      expiresAt: feed.expires_at.toISOString(),
      author: {
        userId: feed.author_user.id,
        nickname: feed.author_user.nickname,
        profileImage: feed.author_user.userProfileImages[0]?.image_url ?? null, // 대표 프로필 이미지 (없으면 null)
      },
      keywords: feed.keywords.map((k) => ({
        feedKeywordId: k.feed_keyword.feed_keyword_id,
        name: k.feed_keyword.name,
      })),
      primaryImage: feed.images[0]?.image_url ?? null, // 대표 피드 이미지 (없으면 null)
      commentCount: feed._count.comments,
    }));

    const nextCursor = hasNextPage ? feedsToReturn[feedsToReturn.length - 1].id : null; // 다음 커서 (마지막 피드 ID)

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { items, nextCursor },
    });
  } catch (error) {
    console.error("[GET /api/feeds]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "피드 목록을 불러오는 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}

/**
 * D-02: 피드 작성 API
 *
 * 새 피드를 작성한다.
 * 1인 1활성피드 검증 → 만료시간 계산 (app_settings) → 피드 + 키워드 묶음 생성.
 * 이미지 업로드는 저장소 구현 후 추가 예정 (현재 TODO).
 *
 * @route POST /api/feeds
 *
 * @requires 인증 - 로그인 사용자만 (author_user_id 필요)
 *
 * @param text - 피드 본문 (필수, string)
 * @param feedKeywordIds - 선택한 피드 키워드 ID 배열 (필수, number[])
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { feedId: number, expiresAt: string }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 이미 활성 피드 있음, 키워드 유효성 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, self_date_feed_keywords, app_settings 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-02 상세 스펙
 */
export async function POST(request: NextRequest) { // HTTP POST 메서드로 새 피드를 생성하는 API
  try {
    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { text, feedKeywordIds } = body as { text: unknown; feedKeywordIds: unknown };

    if (typeof text !== "string" || !text.trim()) { // 본문이 빈 값이거나 문자열이 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TEXT",
            message: "피드 본문은 빈 값이 아닌 문자열이어야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(feedKeywordIds) || feedKeywordIds.length === 0) { // 키워드 배열이 비어있거나 배열이 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_KEYWORDS",
            message: "피드 키워드 ID 배열은 1개 이상이어야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    const hasInvalidId = feedKeywordIds.some((id) => typeof id !== "number" || !Number.isInteger(id)); // 배열 내 모든 값이 정수인지 검증
    if (hasInvalidId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_KEYWORD_ID",
            message: "피드 키워드 ID는 모두 정수여야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const authorUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const now = new Date();

    const existingActiveFeed = await prisma.selfDateFeed.findFirst({ // 1인 1활성피드 검증: 이미 active + 만료 안 된 피드가 있는지 확인
      where: {
        author_user_id: authorUserId,
        status: "active",
        expires_at: { gt: now }, // 만료시간이 현재보다 미래인 피드만
      },
      select: { id: true },
    });

    if (existingActiveFeed) { // 이미 활성 피드가 있으면 새 작성 불가
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_ALREADY_ACTIVE",
            message: "이미 활성 상태인 피드가 있습니다. 기존 피드가 만료된 후 작성해주세요.",
          },
        },
        { status: 400 },
      );
    }

    const validKeywords = await prisma.feedKeyword.findMany({ // 요청된 키워드 ID들이 실제로 존재하고 활성 상태인지 확인
      where: {
        feed_keyword_id: { in: feedKeywordIds as number[] },
        is_active: true,
      },
      select: { feed_keyword_id: true },
    });

    if (validKeywords.length !== feedKeywordIds.length) { // 유효하지 않은 키워드가 포함된 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_KEYWORD_ID",
            message: "존재하지 않거나 비활성 상태인 키워드가 포함되어 있습니다.",
          },
        },
        { status: 400 },
      );
    }

    const festivalModeSetting = await prisma.appSetting.findUnique({ // 축제 모드 여부 확인 → 만료시간 결정
      where: { key: "festival_mode" },
      select: { value: true },
    });

    const feedExpiryHoursSetting = await prisma.appSetting.findUnique({ // 피드 만료 시간(시) 설정값 조회
      where: { key: "feed_expiry_hours" },
      select: { value: true },
    });

    const isFestivalMode = festivalModeSetting?.value === "true"; // 축제 모드: "true" 문자열이면 활성
    const defaultExpiryHours = isFestivalMode ? 2 : 24; // 축제 모드면 2시간, 아니면 24시간
    const expiryHours = feedExpiryHoursSetting ? Number(feedExpiryHoursSetting.value) : defaultExpiryHours; // app_settings에 값이 있으면 그 값 사용, 없으면 기본값

    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000); // 현재 시각 + 만료 시간(시)으로 만료일시 계산

    const feed = await prisma.$transaction(async (tx) => { // 묶음 처리: 피드 생성 + 키워드 연결을 하나의 트랜잭션으로
      const createdFeed = await tx.selfDateFeed.create({ // 피드 본체 생성
        data: {
          author_user_id: authorUserId,
          text: text.trim(),
          expires_at: expiresAt,
        },
        select: { id: true, expires_at: true },
      });

      await tx.selfDateFeedKeyword.createMany({ // 피드↔키워드 연결 생성
        data: (feedKeywordIds as number[]).map((kwId) => ({
          feed_id: createdFeed.id,
          feed_keyword_id: kwId,
        })),
      });

      // TODO: 이미지 업로드 + self_date_feed_images 저장 로직 추가 예정

      return createdFeed;
    });

    return NextResponse.json({ // 성공 응답
      success: true,
      data: {
        feedId: feed.id,
        expiresAt: feed.expires_at.toISOString(), // ISO 8601 형식으로 반환
      },
    });
  } catch (error) {
    console.error("[POST /api/feeds]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "피드 작성 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}
