import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";

/**
 * D-13: 전화번호 기반 차단 API
 *
 * 전화번호 기반으로 보고 싶지 않은 사용자를 차단한다.
 * 전화번호는 원문 저장하지 않고 SHA-256 해시값으로만 저장 (개인정보 보호).
 * 중복 방지 제약 (user_id, phone_number_hash) 으로 같은 번호를 두 번 차단하지 않는다.
 *
 * @route POST /api/phone-blocks
 *
 * @requires 인증 - 로그인 사용자만 (user_id 필요)
 *
 * @param phoneNumberE164 - 국제 표준 전화번호 (필수, string, 예: "+821012345678")
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { phoneBlockId: number }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 이미 차단됨 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see phone_blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-13 상세 스펙
 */
export async function POST(request: NextRequest) { // HTTP POST 메서드로 전화번호 차단을 생성하는 API
  try {
    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { phoneNumberE164 } = body as { phoneNumberE164: unknown }; // 전화번호 추출

    if (typeof phoneNumberE164 !== "string" || !phoneNumberE164.trim()) { // 전화번호가 문자열이 아니거나 빈 값인 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PHONE_NUMBER",
            message: "전화번호는 빈 값이 아닌 문자열이어야 합니다.",
          },
        },
        { status: 400 },
      );
    }

    const e164Regex = /^\+[1-9]\d{6,14}$/; // E.164 국제 전화번호 형식 검증 (+ 기호 + 국가코드 + 번호, 7~15자리)
    if (!e164Regex.test(phoneNumberE164)) { // 형식이 맞지 않으면 에러 반환
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PHONE_FORMAT",
            message: "전화번호는 E.164 형식이어야 합니다. (예: +821012345678)",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const userId = 1; // 현재는 고정값 1 사용 (테스트용)

    const phoneNumberHash = createHash("sha256").update(phoneNumberE164).digest("hex"); // 전화번호를 SHA-256 해시로 변환 (원문 저장 안 함)

    const existingBlock = await prisma.phoneBlock.findUnique({ // 이미 차단된 번호인지 확인
      where: {
        user_id_phone_number_hash: { // unique 제약 조건 (user_id + phone_number_hash)
          user_id: userId,
          phone_number_hash: phoneNumberHash,
        },
      },
      select: { id: true, unblocked_at: true },
    });

    if (existingBlock && !existingBlock.unblocked_at) { // 차단 중인 번호가 이미 존재하면 에러 반환
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_BLOCKED",
            message: "이미 차단한 전화번호입니다.",
          },
        },
        { status: 400 },
      );
    }

    if (existingBlock && existingBlock.unblocked_at) { // 과거에 차단했다가 해제한 경우 → 다시 차단 (unblocked_at 초기화)
      const reblocked = await prisma.phoneBlock.update({
        where: { id: existingBlock.id },
        data: { unblocked_at: null }, // 차단 해제 시각 초기화 → 다시 활성 차단 상태
        select: { id: true },
      });

      return NextResponse.json({ // 재차단 성공 응답
        success: true,
        data: { phoneBlockId: reblocked.id },
      });
    }

    const phoneBlock = await prisma.phoneBlock.create({ // 신규 전화번호 차단 생성
      data: {
        user_id: userId,
        phone_number_hash: phoneNumberHash, // 해시값만 저장
      },
      select: { id: true },
    });

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { phoneBlockId: phoneBlock.id },
    });
  } catch (error) {
    console.error("[POST /api/phone-blocks]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "전화번호 차단 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}
