import type { NextRequest } from "next/server";
import { getAuthUserId } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { dismissCandidate } from "@/server/services/matching/recommendation.service";

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const body = await req.json();
    const { item_id } = body;

    if (!item_id || typeof item_id !== "number") {
      return fail(ERROR.INVALID_INPUT, "item_id가 필요합니다.");
    }

    const data = await dismissCandidate(userId, item_id);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/recommendations/dismiss]", e);
    return fail(ERROR.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");
  }
}
