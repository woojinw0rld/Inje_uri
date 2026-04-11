import type { NextRequest } from 'next/server';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { toAuthUserSummary } from '@/lib/server/auth/payload';

export const runtime = 'nodejs';

export const GET = withAuth(async (_request: NextRequest, auth) => {
  return ok({
    user: toAuthUserSummary(auth.user),
    sessionExpiresAt: auth.session.expires_at.toISOString(),
  });
});

