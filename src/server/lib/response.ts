import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

function statusForErrorCode(code: string): number {
  if (code === "UNAUTHORIZED") {
    return 401;
  }

  if (code === "FORBIDDEN" || code === "BLOCKED_RELATION" || code === "BLOCKED_RELATIONSHIP") {
    return 403;
  }

  if (code === "NOT_FOUND" || code === "TARGET_NOT_FOUND" || code.endsWith("_NOT_FOUND")) {
    return 404;
  }

  if (code === "CONFLICT" || code.startsWith("ALREADY_") || code.includes("_ALREADY_") || code.startsWith("DUPLICATE_")) {
    return 409;
  }

  if (code === "INTERNAL_ERROR" || code === "INTERNAL_SERVER_ERROR") {
    return 500;
  }

  return 400;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = statusForErrorCode(code)) {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiResponse<never>, { status });
}
