import type { NextRequest } from 'next/server';
import { withAuth } from '@/server/lib/auth';
import { apiErrors } from '@/server/lib/errors';
import { ok } from '@/server/lib/response';
import { uploadProfileImage } from '@/server/services/user/profile-image.service';

export const runtime = 'nodejs';

export const POST = withAuth(async (request: NextRequest, auth) => {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw apiErrors.validation('multipart/form-data 형식으로 요청해주세요.');
  }

  return ok(await uploadProfileImage(auth.user.id, formData), { status: 201 });
});
