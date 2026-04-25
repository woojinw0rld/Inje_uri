import type { NextResponse } from 'next/server';
import {
  APP_AUTH_COOKIE_MAX_AGE_SECONDS,
  APP_AUTH_COOKIE_NAME,
  APP_AUTH_COOKIE_VALUE,
} from '@/lib/auth/constants';

export function attachAppAccessCookie(response: NextResponse) {
  response.cookies.set(APP_AUTH_COOKIE_NAME, APP_AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: APP_AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAppAccessCookie(response: NextResponse) {
  response.cookies.set(APP_AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}
