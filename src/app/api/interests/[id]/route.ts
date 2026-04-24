import type { NextRequest } from "next/server";
import { getAuthUserId } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { acceptInterest, declineInterest } from "@/server/services/matching/interest.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthUserId(req);
    const { id } = await params;
    const interestId = parseInt(id, 10);

    if (isNaN(interestId) || interestId <= 0) {
      return fail(ERROR.INVALID_INPUT, "유효하지 않은 호감 ID입니다.");
    }

    const body = await req.json();
    const { action } = body;

    if (action === "accept") {
      const data = await acceptInterest(userId, interestId);
      return ok(data);
    }

    if (action === "decline") {
      const data = await declineInterest(userId, interestId);
      return ok(data);
    }

    return fail(ERROR.INVALID_INPUT, "action은 'accept' 또는 'decline'이어야 합니다.");
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/interests/[id]]", e);
    return fail(ERROR.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");
  }
}
