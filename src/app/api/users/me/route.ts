import type { NextRequest } from 'next/server';
import { withAuth } from '@/server/lib/auth';
import { apiErrors } from '@/server/lib/errors';
import { ok } from '@/server/lib/response';
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  type UserPatchBody,
} from '@/server/services/user/user.service';

export const runtime = 'nodejs';

export const GET = withAuth(async (_request: NextRequest, auth) => {
  return ok(await getCurrentUserProfile(auth.user.id));
});

export const PATCH = withAuth(async (request: NextRequest, auth) => {
  let body: UserPatchBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  return ok(await updateCurrentUserProfile(auth.user.id, body));
});
