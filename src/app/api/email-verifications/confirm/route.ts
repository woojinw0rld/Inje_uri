import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import { hashVerificationCode, isSchoolEmail, normalizeEmail } from '@/lib/server/auth/email-verification';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface VerificationConfirmBody {
  schoolEmail?: unknown;
  code?: unknown;
}

function parseRequest(body: VerificationConfirmBody) {
  const schoolEmail = normalizeEmail(typeof body.schoolEmail === 'string' ? body.schoolEmail : '');
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  if (!schoolEmail || !code) {
    throw apiErrors.validation('학교 이메일과 인증 코드를 모두 입력해주세요.');
  }

  if (!isSchoolEmail(schoolEmail)) {
    throw apiErrors.validation('학교 이메일 형식이 아닙니다.');
  }

  if (!/^\d{6}$/.test(code)) {
    throw apiErrors.validation('인증 코드는 6자리 숫자여야 합니다.');
  }

  return { schoolEmail, code };
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: VerificationConfirmBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const { schoolEmail, code } = parseRequest(body);
  const verification = await prisma.emailVerification.findFirst({
    where: {
      user_id: auth.user.id,
      school_email: schoolEmail,
      status: 'pending',
    },
    orderBy: { id: 'desc' },
  });

  if (!verification) {
    throw apiErrors.notFound('유효한 인증 요청을 찾을 수 없습니다.');
  }

  const now = new Date();
  if (verification.expires_at.getTime() <= now.getTime()) {
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { status: 'expired' },
    });
    throw apiErrors.validation('인증 코드가 만료되었습니다. 다시 요청해주세요.');
  }

  const inputHash = hashVerificationCode(code);
  if (inputHash !== verification.code_hash) {
    throw apiErrors.validation('인증 코드가 올바르지 않습니다.');
  }

  const verifiedAt = new Date();
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      status: 'verified',
      verified_at: verifiedAt,
    },
  });

  await prisma.emailVerification.updateMany({
    where: {
      user_id: auth.user.id,
      school_email: schoolEmail,
      status: 'pending',
      id: { not: verification.id },
    },
    data: { status: 'expired' },
  });

  return ok({
    verified: true,
    schoolEmail,
    verifiedAt: verifiedAt.toISOString(),
  });
});

