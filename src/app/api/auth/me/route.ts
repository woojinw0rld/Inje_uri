import type { NextRequest } from 'next/server';
import {
  toAuthUserSummary,
  withAuth,
} from '@/server/lib/auth';
import { ok } from '@/server/lib/response';

export const runtime = 'nodejs';

export const GET = withAuth(async (_request: NextRequest, auth) => {
  return ok({
    user: toAuthUserSummary(auth.user),
    sessionExpiresAt: auth.session.expires_at.toISOString(),
  });
});
