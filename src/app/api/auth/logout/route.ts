import type { NextRequest } from 'next/server';
import {
  clearAppAccessCookie,
  clearPreSignupCookie,
  clearSessionCookie,
  withAuth,
} from '@/server/lib/auth';
import { ok } from '@/server/lib/response';
import { logout } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

export const POST = withAuth(async (_request: NextRequest, auth) => {
  const data = await logout(auth.session.id);
  const response = ok(data);
  clearSessionCookie(response);
  clearAppAccessCookie(response);
  clearPreSignupCookie(response);
  return response;
});
