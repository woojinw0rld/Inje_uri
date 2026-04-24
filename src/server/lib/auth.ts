import type { NextRequest } from "next/server";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";

/**
 * 요청 헤더에서 유저 ID를 추출한다.
 * A파트 인증 구현 전까지 x-user-id 헤더를 stub으로 사용한다.
 */
export async function getAuthUserId(req: NextRequest): Promise<number> {
  const userIdHeader = req.headers.get("x-user-id");

  if (!userIdHeader) {
    throw new ApiError(ERROR.UNAUTHORIZED, "인증되지 않은 요청입니다.");
  }

  const userId = parseInt(userIdHeader, 10);

  if (isNaN(userId) || userId <= 0) {
    throw new ApiError(ERROR.UNAUTHORIZED, "인증되지 않은 요청입니다.");
  }

  return userId;
}
