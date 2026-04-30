import { requireCurrentUser } from '@/server/lib/auth';
import { apiErrors } from '@/server/lib/errors';
import { ok, toErrorResponse } from '@/server/lib/response';
import { deleteProfileImage } from '@/server/services/user/profile-image.service';

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

    return ok(await deleteProfileImage(auth.user.id, imageId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
