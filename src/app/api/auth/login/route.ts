import bcrypt from 'bcrypt';
import { apiErrors } from '@/lib/server/api/errors';
import { ok, toErrorResponse } from '@/lib/server/api/response';
import { ensureActiveUser } from '@/lib/server/auth/current-user';
import { toAuthUserSummary } from '@/lib/server/auth/payload';
import { attachSessionCookie, createUserSession } from '@/lib/server/auth/session';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function isEmailVerified(userId: number): Promise<boolean> {
  const verification = await prisma.emailVerification.findFirst({
    where: {
      user_id: userId,
      status: 'verified',
      verified_at: { not: null },
    },
    orderBy: { id: 'desc' },
    select: { id: true },
  });

  return Boolean(verification);
}

export async function POST(request: Request) {
  try {
    let body: LoginRequestBody;

    try {
      body = await request.json();
    } catch {
      throw apiErrors.validation('요청 형식을 확인해주세요.');
    }

    const email = normalizeString(body.email).toLowerCase();
    const password = normalizeString(body.password);

    if (!email || !password) {
      throw apiErrors.validation('이메일과 비밀번호를 모두 입력해주세요.');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw apiErrors.unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatched) {
      throw apiErrors.unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    ensureActiveUser(user);

    const { token, expiresAt } = await createUserSession(user.id);
    const needsEmailVerification = !(await isEmailVerified(user.id));

    const response = ok({
      user: toAuthUserSummary(user),
      sessionExpiresAt: expiresAt.toISOString(),
      needsEmailVerification,
    });

    attachSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

