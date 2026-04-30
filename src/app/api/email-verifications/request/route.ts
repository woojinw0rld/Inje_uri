import type { NextRequest } from 'next/server';
import { withAuth } from '@/server/lib/auth';
import { ok } from '@/server/lib/response';
import { requestEmailVerification } from '@/server/services/auth/email-verification.service';

export const runtime = 'nodejs';

interface VerificationRequestBody {
  schoolEmail?: unknown;
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: VerificationRequestBody = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawEmail = typeof body.schoolEmail === 'string' ? body.schoolEmail : auth.user.email;
  const data = await requestEmailVerification({
    userId: auth.user.id,
    requestedEmail: rawEmail,
  });

  return ok({
    schoolEmail: data.schoolEmail,
    expiresAt: data.expiresAt.toISOString(),
    ...(data.debugCode ? { debugCode: data.debugCode } : {}),
  });
});
