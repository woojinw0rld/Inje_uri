import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode } from "@/server/lib/errors";

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function ok<T>(data: T, init?: ResponseInit) {
  const status = init?.status ?? 200;
  return NextResponse.json<ApiSuccessEnvelope<T>>({ success: true, data }, { ...init, status });
}

export function fail(code: ApiErrorCode, message: string, status: number, init?: ResponseInit) {
  return NextResponse.json<ApiErrorEnvelope>(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { ...init, status },
  );
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.status);
  }

  console.error('[api-error]', error);
  return fail('INTERNAL_ERROR', '서버 내부 오류가 발생했습니다.', 500);
}
