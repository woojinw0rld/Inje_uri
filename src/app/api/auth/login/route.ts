import { NextResponse } from 'next/server';
import {
  APP_AUTH_COOKIE_MAX_AGE_SECONDS,
  APP_AUTH_COOKIE_NAME,
  APP_AUTH_COOKIE_VALUE,
  BUS_LOGIN_ENDPOINT,
} from '@/lib/auth/constants';

interface LoginRequestBody {
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

function safeJsonParse(input: string): UpstreamLoginResponse | null {
  try {
    return JSON.parse(input) as UpstreamLoginResponse;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: '요청 형식을 확인해주세요.' },
      { status: 400 },
    );
  }

  const studentId = normalizeCredential(body.studentId);
  const password = normalizeCredential(body.password);

  if (!studentId || !password) {
    return NextResponse.json(
      { ok: false, message: '학번과 비밀번호를 모두 입력해주세요.' },
      { status: 400 },
    );
  }

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
      { ok: false, message: '인제대학교 버스 인증 서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }

  const isLoginSuccess = upstreamStatus === 200 && upstreamBody?.status === 'success';

  if (!isLoginSuccess) {
    const message = upstreamBody?.message || '로그인이 거부되었습니다. 학번 또는 비밀번호를 확인해주세요.';
    return NextResponse.json(
      { ok: false, message, upstreamStatus },
      { status: 401 },
    );
  }

  const response = NextResponse.json(
    { ok: true, upstreamStatus },
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
