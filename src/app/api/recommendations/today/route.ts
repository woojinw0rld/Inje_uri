import type { NextRequest } from "next/server";
import { getAuthUserId } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { getTodayRecommendations } from "@/server/services/matching/recommendation.service";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const data = await getTodayRecommendations(userId);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[GET /api/recommendations/today]", e);
    return fail(ERROR.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");
  }
}
