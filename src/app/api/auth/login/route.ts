import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { ensureActiveUser } from '@/lib/server/auth/current-user';
import { attachAppAccessCookie } from '@/lib/server/auth/app-access-cookie';
import { attachSessionCookie, createUserSession } from '@/lib/server/auth/session';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface LoginRequestBody {
  loginId?: unknown;
  password?: unknown;
}

function normalizeCredential(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validationFail(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: LoginRequestBody;
  try {
    body = await request.json() as LoginRequestBody;
  } catch {
    return validationFail('요청 형식을 확인해주세요.');
  }

  const loginId = normalizeCredential(body.loginId);
  const password = normalizeCredential(body.password);

  if (!loginId || !password) {
    return validationFail('아이디와 비밀번호를 모두 입력해주세요.');
  }

  const user = await prisma.user.findUnique({
    where: { login_id: loginId },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordMatched) {
    return NextResponse.json(
      { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  ensureActiveUser(user);

  const { token, expiresAt } = await createUserSession(user.id);
  const response = NextResponse.json(
    {
      ok: true,
      message: '로그인되었습니다.',
      sessionExpiresAt: expiresAt.toISOString(),
    },
    { status: 200 },
  );

  attachSessionCookie(response, token, expiresAt);
  attachAppAccessCookie(response);
  return response;
}
