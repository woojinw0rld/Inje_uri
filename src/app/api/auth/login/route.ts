import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import {
  APP_AUTH_COOKIE_MAX_AGE_SECONDS,
  APP_AUTH_COOKIE_NAME,
  APP_AUTH_COOKIE_VALUE,
  BUS_LOGIN_ENDPOINT,
} from '@/lib/auth/constants';
import { apiErrors } from '@/lib/server/api/errors';
import { ok, toErrorResponse } from '@/lib/server/api/response';
import { ensureActiveUser } from '@/lib/server/auth/current-user';
import { toAuthUserSummary } from '@/lib/server/auth/payload';
import { attachSessionCookie, createUserSession } from '@/lib/server/auth/session';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface LoginRequestBody {
  email?: unknown;
  studentId?: unknown;
  password?: unknown;
}

interface UpstreamLoginResponse {
  status?: string;
  message?: string;
}

function normalizeCredential(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeJsonParse(input: string): UpstreamLoginResponse | null {
  try {
    return JSON.parse(input) as UpstreamLoginResponse;
  } catch {
    return null;
  }
}

function tryParseUpstreamBody(rawText: string): UpstreamLoginResponse | null {
  const parsed = safeJsonParse(rawText);
  if (parsed) {
    return parsed;
  }

  const jsonStart = rawText.lastIndexOf('{');
  if (jsonStart < 0) {
    return null;
  }

  return safeJsonParse(rawText.slice(jsonStart));
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

async function loginWithStudentId(studentId: string, password: string) {
  let upstreamStatus = 0;
  let upstreamBody: UpstreamLoginResponse | null = null;

  try {
    const upstreamResponse = await fetch(BUS_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        id: studentId,
        password,
        s_cookie: '',
      }),
      cache: 'no-store',
    });

    upstreamStatus = upstreamResponse.status;
    upstreamBody = tryParseUpstreamBody(await upstreamResponse.text());
  } catch {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        message: '인제대학교 버스 인증 서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.',
      },
      { status: 502 },
    );
  }

  const isLoginSuccess = upstreamStatus === 200 && upstreamBody?.status === 'success';
  if (!isLoginSuccess) {
    const message = upstreamBody?.message || '로그인이 거부되었습니다. 학번 또는 비밀번호를 확인해주세요.';
    return NextResponse.json(
      { ok: false, success: false, message, upstreamStatus },
      { status: 401 },
    );
  }

  const response = NextResponse.json(
    { ok: true, success: true, upstreamStatus },
    { status: 200 },
  );

  response.cookies.set(APP_AUTH_COOKIE_NAME, APP_AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: APP_AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

async function loginWithEmail(email: string, password: string) {
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
}

export async function POST(request: Request) {
  try {
    let body: LoginRequestBody;

    try {
      body = await request.json();
    } catch {
      throw apiErrors.validation('요청 형식을 확인해주세요.');
    }

    const email = normalizeCredential(body.email).toLowerCase();
    const studentId = normalizeCredential(body.studentId);
    const password = normalizeCredential(body.password);

    if (!password || (!email && !studentId)) {
      throw apiErrors.validation('로그인 식별자와 비밀번호를 모두 입력해주세요.');
    }

    if (studentId) {
      return await loginWithStudentId(studentId, password);
    }

    return await loginWithEmail(email, password);
  } catch (error) {
    return toErrorResponse(error);
  }
}
