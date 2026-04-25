import type { NextRequest } from 'next/server';
import { ok } from '@/lib/server/api/response';
import { clearAppAccessCookie } from '@/lib/server/auth/app-access-cookie';
import { clearPreSignupCookie } from '@/lib/server/auth/pre-signup';
import { withAuth } from '@/lib/server/auth/middleware';
import { clearSessionCookie } from '@/lib/server/auth/session';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

export const POST = withAuth(async (_request: NextRequest, auth) => {
  try {
    await prisma.authSession.delete({
      where: { id: auth.session.id },
    });
  } catch {
    // Ignore missing session rows to keep logout idempotent.
  }

  const response = ok({ loggedOut: true });
  clearSessionCookie(response);
  clearAppAccessCookie(response);
  clearPreSignupCookie(response);
  return response;
});
