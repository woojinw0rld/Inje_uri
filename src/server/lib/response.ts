import { NextResponse } from "next/server";

  /**
   * 성공 응답 반환
   * @param data - 응답 바디에 담을 데이터
   * @param status - HTTP 상태 코드 (기본값 200)
   */
  export function ok<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
  }

  /**
   * 실패 응답 반환
   * @param message - 에러 코드 (errors.ts의 ERROR 상수 사용 권장)
   * @param status - HTTP 상태 코드 (예: 400, 401, 403, 404)
   */
  export function fail(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
  }

/*
  ---
  사용 예시:
  // 성공
  return ok({ chatRoomId: 3 });           // 200
  return ok({ chatRoomId: 3 }, 201);      // 201 Created

  // 실패
  return fail(ERROR.UNAUTHORIZED, 401);
  return fail(ERROR.NOT_FOUND, 404);
*/