/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiErrors } from '@/lib/server/api/errors';
import { ok, toErrorResponse } from '@/lib/server/api/response';
import { requireCurrentUser } from '@/lib/server/auth/current-user';
import { prisma } from '@/lib/server/prisma';
import { removeStoredProfileImage } from '@/lib/server/users/profile-images';

export const runtime = 'nodejs';

function parseImageIdFromPath(pathname: string): number {
  const imageIdRaw = pathname.split('/').filter(Boolean).at(-1);
  const imageId = Number(imageIdRaw);

  if (!imageId || Number.isNaN(imageId)) {
    throw apiErrors.validation('imageId 형식을 확인해주세요.');
  }

  return imageId;
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireCurrentUser(request);
    const pathname = new URL(request.url).pathname;
    const imageId = parseImageIdFromPath(pathname);

    const targetImage = await prisma.userProfileImage.findFirst({
      where: {
        id: imageId,
        user_id: auth.user.id,
      },
    });

    if (!targetImage) {
      throw apiErrors.notFound('프로필 이미지를 찾을 수 없습니다.');
    }

    await prisma.userProfileImage.delete({
      where: { id: targetImage.id },
    });

    const remainingImages = await prisma.userProfileImage.findMany({
      where: { user_id: auth.user.id },
      orderBy: { sort_order: 'asc' },
    });

    for (const [index, image] of remainingImages.entries()) {
      const nextOrder = index + 1;
      if (image.sort_order !== nextOrder) {
        await prisma.userProfileImage.update({
          where: { id: image.id },
          data: { sort_order: nextOrder },
        });
      }
    }

    if (targetImage.is_primary && remainingImages.length > 0) {
      const hasPrimary = remainingImages.some((image: any) => image.is_primary);
      if (!hasPrimary) {
        await prisma.userProfileImage.update({
          where: { id: remainingImages[0].id },
          data: { is_primary: true },
        });
      }
    }

    await removeStoredProfileImage(targetImage.image_url);
    return ok({ deletedImageId: targetImage.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
