import type { NextRequest } from "next/server";
import { getAuthUserId } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import prisma from "@/server/db/prisma";
import type { RecommendationSettingsResponse } from "@/server/types/recommendation.types";

const DEFAULT_SETTINGS: RecommendationSettingsResponse = {
  exclude_same_department: false,
  reduce_same_year: false,
  preferred_age_min: null,
  preferred_age_max: null,
  updated_at: new Date().toISOString(),
};

// ─────────────────────────────────────────────
// GET: 추천 설정 조회
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const setting = await prisma.recommendationSetting.findUnique({
      where: { user_id: userId },
    });

    if (!setting) {
      return ok(DEFAULT_SETTINGS);
    }

    return ok({
      exclude_same_department: setting.exclude_same_department,
      reduce_same_year: setting.reduce_same_year,
      preferred_age_min: setting.preferred_age_min,
      preferred_age_max: setting.preferred_age_max,
      updated_at: setting.updated_at.toISOString(),
    } satisfies RecommendationSettingsResponse);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[GET /api/recommendation-settings]", e);
    return fail(ERROR.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");
  }
}

// ─────────────────────────────────────────────
// PATCH: 추천 설정 업데이트 (부분 업데이트 UPSERT)
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const body = await req.json();

    const {
      exclude_same_department,
      reduce_same_year,
      preferred_age_min,
      preferred_age_max,
    } = body;

    // 나이 범위 검증
    if (
      preferred_age_min !== undefined &&
      preferred_age_max !== undefined &&
      preferred_age_min !== null &&
      preferred_age_max !== null &&
      preferred_age_min > preferred_age_max
    ) {
      return fail(ERROR.INVALID_INPUT, "최소 나이는 최대 나이보다 클 수 없습니다.");
    }

    const existing = await prisma.recommendationSetting.findUnique({
      where: { user_id: userId },
    });

    const data = {
      exclude_same_department:
        exclude_same_department !== undefined
          ? exclude_same_department
          : (existing?.exclude_same_department ?? false),
      reduce_same_year:
        reduce_same_year !== undefined
          ? reduce_same_year
          : (existing?.reduce_same_year ?? false),
      preferred_age_min:
        preferred_age_min !== undefined
          ? preferred_age_min
          : (existing?.preferred_age_min ?? null),
      preferred_age_max:
        preferred_age_max !== undefined
          ? preferred_age_max
          : (existing?.preferred_age_max ?? null),
      updated_at: new Date(),
    };

    const setting = await prisma.recommendationSetting.upsert({
      where: { user_id: userId },
      update: data,
      create: { user_id: userId, ...data },
    });

    return ok({
      exclude_same_department: setting.exclude_same_department,
      reduce_same_year: setting.reduce_same_year,
      preferred_age_min: setting.preferred_age_min,
      preferred_age_max: setting.preferred_age_max,
      updated_at: setting.updated_at.toISOString(),
    } satisfies RecommendationSettingsResponse);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[PATCH /api/recommendation-settings]", e);
    return fail(ERROR.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");
  }
}
