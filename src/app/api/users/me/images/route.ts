import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';
import { MAX_PROFILE_IMAGES, saveProfileImageFile } from '@/lib/server/users/profile-images';

export const runtime = 'nodejs';

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw apiErrors.validation('multipart/form-data 형식으로 요청해주세요.');
  }

  const imageEntry = formData.get('image');
  const imageUrlEntry = formData.get('imageUrl');

  let imageUrl = '';
  if (imageEntry instanceof File && imageEntry.size > 0) {
    imageUrl = await saveProfileImageFile(imageEntry);
  } else if (typeof imageUrlEntry === 'string') {
    imageUrl = imageUrlEntry.trim();
  }

  if (!imageUrl) {
    throw apiErrors.validation('업로드할 이미지가 필요합니다.');
  }

  const requestedPrimary = parseBoolean(formData.get('isPrimary'));
  const createdImage = await prisma.$transaction(async (tx) => {
    const images = await tx.userProfileImage.findMany({
      where: { user_id: auth.user.id },
      orderBy: { sort_order: 'asc' },
    });

    if (images.length >= MAX_PROFILE_IMAGES) {
      throw apiErrors.conflict(`프로필 이미지는 최대 ${MAX_PROFILE_IMAGES}개까지 등록할 수 있습니다.`);
    }

    const shouldSetPrimary = requestedPrimary || images.length === 0;
    if (shouldSetPrimary) {
      await tx.userProfileImage.updateMany({
        where: { user_id: auth.user.id },
        data: { is_primary: false },
      });
    }

    const maxSortOrder = images.reduce((maxValue, image) => Math.max(maxValue, image.sort_order), 0);
    return tx.userProfileImage.create({
      data: {
        user_id: auth.user.id,
        image_url: imageUrl,
        sort_order: maxSortOrder + 1,
        is_primary: shouldSetPrimary,
      },
    });
  });

  return ok({
    image: {
      id: createdImage.id,
      imageUrl: createdImage.image_url,
      sortOrder: createdImage.sort_order,
      isPrimary: createdImage.is_primary,
    },
  }, { status: 201 });
});

