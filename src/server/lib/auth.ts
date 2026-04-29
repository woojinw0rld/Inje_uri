import type { NextRequest } from "next/server";
import { ApiError as SharedApiError } from "@/lib/server/api/errors";
import { requireCurrentUser } from "@/lib/server/auth/current-user";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";

/**
 * 세션 쿠키에서 인증된 활성 유저 ID를 추출한다.
 */
export async function getAuthUserId(req: NextRequest): Promise<number> {
  try {
    const auth = await requireCurrentUser(req);
    return auth.user.id;
  } catch (error) {
    if (error instanceof SharedApiError) {
      throw new ApiError(error.code, error.message);
    }

    throw new ApiError(ERROR.UNAUTHORIZED, "인증되지 않은 요청입니다.");
  }
}
