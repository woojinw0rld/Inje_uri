import type { NextRequest } from 'next/server';
import { withAuth } from '@/server/lib/auth';
import { apiErrors } from '@/server/lib/errors';
import { ok } from '@/server/lib/response';
import { confirmEmailVerification } from '@/server/services/auth/email-verification.service';

export const runtime = 'nodejs';

interface VerificationConfirmBody {
  schoolEmail?: unknown;
  code?: unknown;
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: VerificationConfirmBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const data = await confirmEmailVerification({
    userId: auth.user.id,
    schoolEmail: typeof body.schoolEmail === 'string' ? body.schoolEmail : '',
    code: typeof body.code === 'string' ? body.code : '',
  });

  return ok({
    verified: data.verified,
    schoolEmail: data.schoolEmail,
    verifiedAt: data.verifiedAt.toISOString(),
  });
});
