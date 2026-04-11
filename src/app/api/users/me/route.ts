import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface KeywordSelectionInput {
  categoryId?: unknown;
  keywordIds?: unknown;
}

interface UserPatchBody {
  profile?: {
    nickname?: unknown;
    bio?: unknown;
    age?: unknown;
    gender?: unknown;
    nationality?: unknown;
    university?: unknown;
    department?: unknown;
    studentYear?: unknown;
    onboardingCompleted?: unknown;
  };
  keywordSelections?: unknown;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

function groupSelectionsByCategory(
  selections: Array<{
    category_id: number;
    category_code: string;
    category_name: string;
    selection_type: string;
    max_select_count: number;
    keyword_id: number;
    keyword_code: string;
    keyword_label: string;
    keyword_sort_order: number;
  }>,
) {
  const grouped = new Map<number, {
    categoryId: number;
    categoryCode: string;
    categoryName: string;
    selectionType: string;
    maxSelectCount: number;
    keywords: Array<{
      id: number;
      code: string;
      label: string;
      sortOrder: number;
    }>;
  }>();

  for (const selection of selections) {
    if (!grouped.has(selection.category_id)) {
      grouped.set(selection.category_id, {
        categoryId: selection.category_id,
        categoryCode: selection.category_code,
        categoryName: selection.category_name,
        selectionType: selection.selection_type,
        maxSelectCount: selection.max_select_count,
        keywords: [],
      });
    }

    grouped.get(selection.category_id)?.keywords.push({
      id: selection.keyword_id,
      code: selection.keyword_code,
      label: selection.keyword_label,
      sortOrder: selection.keyword_sort_order,
    });
  }

  return Array.from(grouped.values()).sort((left, right) => left.categoryId - right.categoryId);
}

async function loadCurrentUserProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userProfileImages: {
        orderBy: { sort_order: 'asc' },
      },
      userKeywordSelections: {
        include: {
          category: true,
          keyword: true,
        },
      },
    },
  });

  if (!user) {
    throw apiErrors.notFound('사용자 정보를 찾을 수 없습니다.');
  }

  return {
    user: {
      id: user.id,
      realName: user.real_name,
      email: user.email,
      nickname: user.nickname,
      gender: user.gender,
      age: user.age,
      phoneNumber: user.phone_number,
      nationality: user.nationality,
      university: user.university,
      department: user.department,
      studentYear: user.student_year,
      studentNumber: user.student_number,
      bio: user.bio,
      onboardingCompleted: user.onboarding_completed,
      status: user.status,
      createdAt: user.created_at.toISOString(),
      lastActiveAt: user.last_active_at?.toISOString() ?? null,
    },
    profileImages: user.userProfileImages.map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      sortOrder: image.sort_order,
      isPrimary: image.is_primary,
    })),
    keywordSelections: groupSelectionsByCategory(
      user.userKeywordSelections.map((selection) => ({
        category_id: selection.category.category_id,
        category_code: selection.category.category_code,
        category_name: selection.category.name,
        selection_type: selection.category.selection_type,
        max_select_count: selection.category.max_select_count,
        keyword_id: selection.keyword.keyword_id,
        keyword_code: selection.keyword.keyword_code,
        keyword_label: selection.keyword.label,
        keyword_sort_order: selection.keyword.sort_order,
      })),
    ),
  };
}

async function normalizeKeywordSelections(rawValue: unknown) {
  if (rawValue === undefined) {
    return null;
  }

  if (!Array.isArray(rawValue)) {
    throw apiErrors.validation('keywordSelections는 배열이어야 합니다.');
  }

  const normalized = rawValue.map((item) => {
    const selection = item as KeywordSelectionInput;
    const categoryId = toOptionalNumber(selection.categoryId);
    const rawKeywordIds = selection.keywordIds;

    if (!categoryId || !Array.isArray(rawKeywordIds)) {
      throw apiErrors.validation('categoryId와 keywordIds 형식을 확인해주세요.');
    }

    const keywordIds = [...new Set(
      rawKeywordIds
        .map((keywordId) => (typeof keywordId === 'number' ? keywordId : Number.NaN))
        .filter((keywordId) => !Number.isNaN(keywordId)),
    )];

    return { categoryId, keywordIds };
  });

  const categoryIds = normalized.map((item) => item.categoryId);
  const uniqueCategoryCount = new Set(categoryIds).size;
  if (uniqueCategoryCount !== categoryIds.length) {
    throw apiErrors.validation('중복된 카테고리는 허용되지 않습니다.');
  }

  const categories = await prisma.category.findMany({
    where: { category_id: { in: categoryIds } },
    include: { keywords: true },
  });

  const categoryMap = new Map(categories.map((category) => [category.category_id, category]));
  if (categoryMap.size !== categoryIds.length) {
    throw apiErrors.validation('존재하지 않는 카테고리가 포함되어 있습니다.');
  }

  for (const item of normalized) {
    const category = categoryMap.get(item.categoryId);
    if (!category) {
      throw apiErrors.validation('존재하지 않는 카테고리가 포함되어 있습니다.');
    }

    const validKeywordIds = new Set(category.keywords.map((keyword) => keyword.keyword_id));
    const hasInvalidKeyword = item.keywordIds.some((keywordId) => !validKeywordIds.has(keywordId));

    if (hasInvalidKeyword) {
      throw apiErrors.validation('카테고리와 맞지 않는 키워드가 포함되어 있습니다.');
    }

    if (item.keywordIds.length > category.max_select_count) {
      throw apiErrors.validation(`${category.name} 선택 개수를 초과했습니다.`);
    }

    if (category.selection_type === 'single' && item.keywordIds.length > 1) {
      throw apiErrors.validation(`${category.name}는 하나만 선택할 수 있습니다.`);
    }
  }

  return normalized;
}

export const GET = withAuth(async (_request: NextRequest, auth) => {
  return ok(await loadCurrentUserProfile(auth.user.id));
});

export const PATCH = withAuth(async (request: NextRequest, auth) => {
  let body: UserPatchBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const updateData: Record<string, string | number | boolean | null> = {};
  const profile = body.profile ?? {};

  if (profile.nickname !== undefined) {
    const nickname = toOptionalString(profile.nickname);
    if (!nickname) {
      throw apiErrors.validation('닉네임을 입력해주세요.');
    }

    if (nickname.length < 2 || nickname.length > 50) {
      throw apiErrors.validation('닉네임은 2자 이상 50자 이하여야 합니다.');
    }

    const duplicatedUser = await prisma.user.findFirst({
      where: {
        nickname,
        id: { not: auth.user.id },
      },
      select: { id: true },
    });

    if (duplicatedUser) {
      throw apiErrors.conflict('이미 사용 중인 닉네임입니다.');
    }

    updateData.nickname = nickname;
  }

  if (profile.bio !== undefined) {
    if (profile.bio === null) {
      updateData.bio = null;
    } else {
      const bio = toOptionalString(profile.bio);
      if (bio === undefined) {
        throw apiErrors.validation('bio 형식을 확인해주세요.');
      }

      if (bio.length > 500) {
        throw apiErrors.validation('자기소개는 500자를 초과할 수 없습니다.');
      }

      updateData.bio = bio;
    }
  }

  if (profile.age !== undefined) {
    if (profile.age === null) {
      updateData.age = null;
    } else {
      const age = toOptionalNumber(profile.age);
      if (!age || age < 18 || age > 100) {
        throw apiErrors.validation('나이 범위를 확인해주세요.');
      }

      updateData.age = age;
    }
  }

  if (profile.gender !== undefined) {
    const gender = toOptionalString(profile.gender);
    if (!gender) {
      throw apiErrors.validation('gender 형식을 확인해주세요.');
    }
    updateData.gender = gender;
  }

  if (profile.nationality !== undefined) {
    const nationality = toOptionalString(profile.nationality);
    if (!nationality) {
      throw apiErrors.validation('nationality 형식을 확인해주세요.');
    }
    updateData.nationality = nationality;
  }

  if (profile.university !== undefined) {
    const university = toOptionalString(profile.university);
    if (!university) {
      throw apiErrors.validation('university 형식을 확인해주세요.');
    }
    updateData.university = university;
  }

  if (profile.department !== undefined) {
    const department = toOptionalString(profile.department);
    if (!department) {
      throw apiErrors.validation('department 형식을 확인해주세요.');
    }
    updateData.department = department;
  }

  if (profile.studentYear !== undefined) {
    const studentYear = toOptionalNumber(profile.studentYear);
    if (!studentYear || studentYear < 1 || studentYear > 8) {
      throw apiErrors.validation('studentYear 범위를 확인해주세요.');
    }
    updateData.student_year = studentYear;
  }

  if (profile.onboardingCompleted !== undefined) {
    if (typeof profile.onboardingCompleted !== 'boolean') {
      throw apiErrors.validation('onboardingCompleted 형식을 확인해주세요.');
    }

    updateData.onboarding_completed = profile.onboardingCompleted;
  }

  const keywordSelections = await normalizeKeywordSelections(body.keywordSelections);

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.user.update({
        where: { id: auth.user.id },
        data: updateData,
      });
    }

    if (keywordSelections !== null) {
      await tx.userKeywordSelection.deleteMany({
        where: { user_id: auth.user.id },
      });

      const rows = keywordSelections.flatMap((selection) => (
        selection.keywordIds.map((keywordId) => ({
          user_id: auth.user.id,
          category_id: selection.categoryId,
          keyword_id: keywordId,
        }))
      ));

      if (rows.length > 0) {
        await tx.userKeywordSelection.createMany({
          data: rows,
        });
      }
    }
  });

  return ok(await loadCurrentUserProfile(auth.user.id));
});
