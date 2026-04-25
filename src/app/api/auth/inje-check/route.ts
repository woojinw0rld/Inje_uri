import { NextResponse } from 'next/server';
import {
  BUS_INJE_CHECK_ENDPOINT,
  INJE_CHECK_FAIL_MESSAGE,
} from '@/lib/auth/constants';
import { prisma } from '@/lib/server/prisma';
import {
  attachPreSignupCookie,
  clearPreSignupCookie,
  issuePreSignupVerification,
  parseUpstreamInjeBody,
} from '@/lib/server/auth/pre-signup';

export const runtime = 'nodejs';

interface InjeCheckBody {
  studentNumber?: unknown;
  birth?: unknown;
}

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validationFail(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function normalizeUpstreamMessage(message: string | undefined): string {
  if (!message) {
    return '';
  }

  return message.replace(/\\\//g, '/').trim();
}

export async function POST(request: Request) {
  let body: InjeCheckBody;

  try {
    body = await request.json() as InjeCheckBody;
  } catch {
    return validationFail('?붿껌 ?뺤떇???뺤씤?댁＜?몄슂.');
  }

  const studentNumber = normalizeValue(body.studentNumber);
  const birth = normalizeValue(body.birth);

  if (!studentNumber) {
    return validationFail('?숇쾲???낅젰?댁＜?몄슂.');
  }

  if (!/^\d{6}$/.test(birth)) {
    return validationFail('?앸뀈?붿씪 6?먮━瑜??낅젰?댁＜?몄슂.');
  }

  let upstreamBody: { status?: string; message?: string } | null = null;
  try {
    const upstreamResponse = await fetch(BUS_INJE_CHECK_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        idx: studentNumber,
        birth,
        check: 'N',
      }),
      cache: 'no-store',
    });

    upstreamBody = parseUpstreamInjeBody(await upstreamResponse.text());
  } catch {
    return NextResponse.json(
      { ok: false, message: '?몄쬆 ?쒕쾭???곌껐?????놁뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.' },
      { status: 502 },
    );
  }

  if (!upstreamBody) {
    return NextResponse.json(
      { ok: false, message: '?몄쬆 ?묐떟??泥섎━?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.' },
      { status: 502 },
    );
  }

  const upstreamMessage = normalizeUpstreamMessage(upstreamBody.message);
  const isNotFoundFailure = upstreamMessage === INJE_CHECK_FAIL_MESSAGE;

  if (isNotFoundFailure) {
    return NextResponse.json(
      { ok: false, message: '?낅젰???뺣낫瑜?李얠쓣???놁뒿?덈떎.' },
      { status: 401 },
    );
  }
  const existingUser = await prisma.user.findFirst({
    where: { student_number: studentNumber },
    select: { id: true },
  });

  if (existingUser) {
    const response = NextResponse.json(
      {
        ok: true,
        verified: true,
        nextStep: 'login',
      },
      { status: 200 },
    );

    clearPreSignupCookie(response);
    return response;
  }

  const token = await issuePreSignupVerification(studentNumber, birth);
  const response = NextResponse.json(
    {
      ok: true,
      verified: true,
      nextStep: 'register',
    },
    { status: 200 },
  );
  attachPreSignupCookie(response, token);
  return response;
}

