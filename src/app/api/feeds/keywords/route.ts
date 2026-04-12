import prisma from "@/server/db/prisma";
import { ok, fail } from "@/server/lib/response";

/**
 * D-10: 피드 키워드 목록 API
 *
 * 피드 작성/필터에 필요한 키워드 목록을 반환한다.
 * feed_keywords 테이블에서 is_active = true인 항목만 sort_order 오름차순으로 조회.
 *
 * @route GET /api/feed-keywords
 *
 * @requires 인증 - 미정 (비로그인 접근 허용 여부 정책 확인 필요)
 *
 * @param 없음 - 요청 파라미터 없이 호출
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: [
 *       { feedKeywordId: number, name: string, sortOrder: number }
 *     ]
 *   }
 * }
 *
 * @returns 400 - 서버 에러
 * {
 *   success: false,
 *   error: { code: "INTERNAL_SERVER_ERROR", message: string }
 * }
 *
 * @see feed_keywords 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-10 상세 스펙
 */
export async function GET() {// HTTP GET(조회) 메서드로 피드 키워드 목록을 반환하는 API
  try {
    const keywords = await prisma.feedKeyword.findMany({
      where: { is_active: true }, // is_active = true 만 조회 
      orderBy: { sort_order: "asc" },  // sort_order ASC: 관리자가 지정한 표시 순서대로 정렬
      select: { // 필요한 필드만 선택하여 조회 (응답 데이터 최소화)
        feed_keyword_id: true, 
        name: true,
        sort_order: true,
      },
    });

    const items = keywords.map((k) => ({ // DB 컬럼명 → 응답 필드명 매핑 / 위에서 만든 keywords 배열을 items 배열로 변환
      feedKeywordId: k.feed_keyword_id, //
      name: k.name,
      sortOrder: k.sort_order,
    }));

    return ok({ items }); // 성공 응답
  } catch (error) { // 에러 처리: 콘솔에 에러 로그 출력 후 클라이언트에 400 응답 반환
    console.error("[GET /api/feed-keywords]", error); // 서버 에러 로그 출력

    return fail("INTERNAL_SERVER_ERROR", "키워드 목록을 불러오는 중 오류가 발생했습니다."); // 실패 응답
  }
}