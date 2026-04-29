import bcrypt from 'bcrypt';
import { attachAppAccessCookie } from '@/lib/server/auth/app-access-cookie';
import { attachSessionCookie, createUserSession } from '@/lib/server/auth/session';
import { toAuthUserSummary } from '@/lib/server/auth/payload';
import { apiErrors } from '@/lib/server/api/errors';
import { fail, ok, toErrorResponse } from '@/lib/server/api/response';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface LoginRequestBody {
  loginId?: unknown;
  studentId?: unknown;
  password?: unknown;
}

function normalizeCredential(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validationFail(message: string) {
  return fail('VALIDATION_ERROR', message, 400);
}

export async function POST(request: Request) {
  try {
    let body: LoginRequestBody;
    try {
      body = await request.json() as LoginRequestBody;
    } catch {
      return validationFail('요청 형식을 확인해주세요.');
    }

    const loginId = normalizeCredential(body.loginId ?? body.studentId);
    const password = normalizeCredential(body.password);

    if (!loginId || !password) {
      return validationFail('아이디와 비밀번호를 모두 입력해주세요.');
    }

    const user = await prisma.user.findUnique({
      where: { login_id: loginId },
    });

    if (!user) {
      throw apiErrors.invalidCredentials();
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatched) {
      throw apiErrors.invalidCredentials();
    }

    if (user.deleted_at !== null || user.status === 'withdrawn') {
      throw apiErrors.accountWithdrawn();
    }

    if (user.status === 'banned' || user.status === 'inactive') {
      throw apiErrors.accountSuspended();
    }

    const { token, expiresAt } = await createUserSession(user.id);
    const response = ok({
      user: toAuthUserSummary(user),
      sessionExpiresAt: expiresAt.toISOString(),
    });

    attachSessionCookie(response, token, expiresAt);
    attachAppAccessCookie(response);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
