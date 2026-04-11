import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  generateVerificationCode,
  hashVerificationCode,
  isSchoolEmail,
  normalizeEmail,
} from '@/lib/server/auth/email-verification';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface VerificationRequestBody {
  schoolEmail?: unknown;
}

function parseSchoolEmail(body: VerificationRequestBody, fallbackEmail: string): string {
  const raw = typeof body.schoolEmail === 'string' ? body.schoolEmail : fallbackEmail;
  const schoolEmail = normalizeEmail(raw);

  if (!schoolEmail) {
    throw apiErrors.validation('학교 이메일을 입력해주세요.');
  }

  if (!isSchoolEmail(schoolEmail)) {
    throw apiErrors.validation('학교 이메일 형식이 아닙니다.');
  }

  return schoolEmail;
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: VerificationRequestBody = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const schoolEmail = parseSchoolEmail(body, auth.user.email);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000);

  await prisma.emailVerification.updateMany({
    where: {
      user_id: auth.user.id,
      school_email: schoolEmail,
      status: 'pending',
    },
    data: {
      status: 'expired',
    },
  });

  await prisma.emailVerification.create({
    data: {
      user_id: auth.user.id,
      school_email: schoolEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
      status: 'pending',
    },
  });

  return ok({
    schoolEmail,
    expiresAt: expiresAt.toISOString(),
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : { debugCode: code }),
  });
});

