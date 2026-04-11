import { createHash, randomBytes } from 'node:crypto';
import { type NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_TOUCH_INTERVAL_SECONDS,
} from '@/lib/server/auth/constants';

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function readSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  const rawValue = cookie.slice(SESSION_COOKIE_NAME.length + 1);
  const value = decodeURIComponent(rawValue);
  return value || null;
}

export async function createUserSession(userId: number) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.authSession.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      last_seen_at: new Date(),
    },
  });

  return { token, expiresAt };
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
}

export function shouldTouchSession(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) {
    return true;
  }

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastSeenAt.getTime()) / 1000);
  return elapsedSeconds >= SESSION_TOUCH_INTERVAL_SECONDS;
}

