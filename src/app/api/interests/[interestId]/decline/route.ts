import type { NextRequest } from "next/server";
import { getAuthUserId } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { declineInterest } from "@/server/services/matching/interest.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interestId: string }> },
) {
  try {
    const userId = await getAuthUserId(req);
    const { interestId } = await params;
    const parsedInterestId = parseInt(interestId, 10);

    if (isNaN(parsedInterestId) || parsedInterestId <= 0) {
      return fail(ERROR.INVALID_INPUT, "유효하지 않은 호감 ID입니다.");
    }

    const data = await declineInterest(userId, parsedInterestId);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/interests/[interestId]/decline]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
