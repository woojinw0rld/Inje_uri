import { createHash, randomBytes } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import {
  PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS,
  PRE_SIGNUP_COOKIE_NAME,
} from '@/lib/auth/constants';
import { prisma } from '@/lib/server/prisma';

export interface InjeCheckResponseBody {
  status?: string;
  message?: string;
}

export interface PreSignupPayload {
  studentNumber: string;
  birthHash: string;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashBirth(birth: string): string {
  return hashValue(birth);
}

export function parseUpstreamInjeBody(rawText: string): InjeCheckResponseBody | null {
  try {
    return JSON.parse(rawText) as InjeCheckResponseBody;
  } catch {
    const jsonStart = rawText.lastIndexOf('{');
    if (jsonStart < 0) {
      return null;
    }

    try {
      return JSON.parse(rawText.slice(jsonStart)) as InjeCheckResponseBody;
    } catch {
      return null;
    }
  }
}

export async function issuePreSignupVerification(studentNumber: string, birth: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashValue(token);
  const birthHash = hashBirth(birth);
  const expiresAt = new Date(Date.now() + PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS * 1000);

  await prisma.preSignupVerification.deleteMany({
    where: {
      OR: [
        { student_number: studentNumber },
        { expires_at: { lte: new Date() } },
      ],
    },
  });

  await prisma.preSignupVerification.create({
    data: {
      token_hash: tokenHash,
      student_number: studentNumber,
      birth_hash: birthHash,
      expires_at: expiresAt,
    },
  });

  return token;
}

export async function consumePreSignupVerification(request: NextRequest): Promise<PreSignupPayload | null> {
  const token = request.cookies.get(PRE_SIGNUP_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashValue(token);
  const row = await prisma.preSignupVerification.findUnique({
    where: { token_hash: tokenHash },
    select: {
      token_hash: true,
      student_number: true,
      birth_hash: true,
      expires_at: true,
    },
  });

  if (!row) {
    return null;
  }

  if (row.expires_at.getTime() <= Date.now()) {
    await prisma.preSignupVerification.delete({ where: { token_hash: row.token_hash } }).catch(() => undefined);
    return null;
  }

  await prisma.preSignupVerification.delete({ where: { token_hash: row.token_hash } });

  return {
    studentNumber: row.student_number,
    birthHash: row.birth_hash,
  };
}

export function attachPreSignupCookie(response: NextResponse, token: string) {
  response.cookies.set(PRE_SIGNUP_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearPreSignupCookie(response: NextResponse) {
  response.cookies.set(PRE_SIGNUP_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}
