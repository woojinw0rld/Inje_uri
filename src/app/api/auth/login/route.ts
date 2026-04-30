import {
  attachAppAccessCookie,
  attachSessionCookie,
} from '@/server/lib/auth';
import { apiErrors } from '@/server/lib/errors';
import { ok, toErrorResponse } from '@/server/lib/response';
import { login } from '@/server/services/auth/auth.service';

export const runtime = 'nodejs';

interface LoginRequestBody {
  loginId?: unknown;
  studentId?: unknown;
  password?: unknown;
}

function normalizeCredential(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    let body: LoginRequestBody;
    try {
      body = await request.json() as LoginRequestBody;
    } catch {
      throw apiErrors.validation('요청 형식을 확인해주세요.');
    }

    const loginId = normalizeCredential(body.loginId ?? body.studentId);
    const password = normalizeCredential(body.password);

    if (!loginId || !password) {
      throw apiErrors.validation('아이디와 비밀번호를 모두 입력해주세요.');
    }

    const result = await login({ loginId, password });
    const response = ok({
      user: result.user,
      sessionExpiresAt: result.expiresAt.toISOString(),
    });

    attachSessionCookie(response, result.token, result.expiresAt);
    attachAppAccessCookie(response);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
