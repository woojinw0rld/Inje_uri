import { NextRequest } from "next/server";
import prisma from "@/server/db/prisma";
import { ok, fail } from "@/server/lib/response";

/**
 * D-09: 피드 조회 기록 API
 *
 * 피드 상세/카드 노출 시 고유 조회자를 기록한다.
 * feed_views 테이블에 UPSERT — 이미 조회했으면 무시, 처음이면 새로 저장.
 * 중복 방지 제약 (feed_id, viewer_user_id) 으로 같은 사람이 여러 번 봐도 1건만 저장.
 *
 * @route POST /api/feeds/:id/view
 *
 * @requires 인증 - 로그인 사용자만 (viewer_user_id 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공 (신규 기록 또는 이미 기록됨)
 * {
 *   success: true,
 *   data: { recorded: true }
 * }
 *
 * @returns 400 - 에러 (피드 없음, 파라미터 오류 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see feed_views 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-09 상세 스펙
 */
export async function POST( // HTTP POST(쓰기) 메서드로 조회 기록을 DB에 저장하는 API
  request: NextRequest, // 요청 객체 (사용하지 않지만 Next.js API 핸들러 시그니처에 필요) 향후 쿠키 등에서 사용자 인증 정보 추출 시 활용 가능
  { params }: { params: Promise<{ id: string }> }, // URL 경로 매개변수 (피드 ID) - Next.js 라우팅에서 자동으로 전달
) {
  try {
    const { id } = await params; // URL에서 피드 ID 추출
    const feedId = Number(id); // 문자열 → 숫자 변환

    if (Number.isNaN(feedId)) { // 피드 ID가 숫자가 아닌 경우
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const viewerUserId = 1; // const viewerUserId = request.userId; // 현재는 고정값 1 사용 (테스트용) → 실제로는 인증된 사용자 ID를 사용해야 함

    const feed = await prisma.selfDateFeed.findUnique({ // 피드 존재 + 활성 상태 확인
      where: { id: feedId },
      select: { id: true, status: true }, // 필요한 필드만 선택하여 조회 (응답 데이터 최소화)
    });

    if (!feed) { // 피드가 없으면 에러 반환
      return fail("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
    }

    if (feed.status !== "active") { // 만료/삭제/숨김 피드는 조회 기록 불가
      return fail("FEED_NOT_ACTIVE", "활성 상태가 아닌 피드입니다.");
    }

    await prisma.feedView.upsert({ // UPSERT 이미 조회했으면 무시, 처음이면 저장(where,create,update)
      where: { //어디에 기록할지
        feed_id_viewer_user_id: { // unique 제약 조건 (feed_id + viewer_user_id)
          feed_id: feedId,
          viewer_user_id: viewerUserId,
        },
      },
      create: { // 처음 조회 시 새로 생성
        feed_id: feedId,
        viewer_user_id: viewerUserId,
      },
      update: {}, // 이미 존재하면 아무것도 변경하지 않음 (멱등성)
    });

    return ok({ recorded: true }); // 성공 응답
  } catch (error) {
    console.error("[POST /api/feeds/:id/view]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "조회 기록 저장 중 오류가 발생했습니다."); // 실패 응답
  }
}
