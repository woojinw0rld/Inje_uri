import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiResponse<never>, { status });
}
