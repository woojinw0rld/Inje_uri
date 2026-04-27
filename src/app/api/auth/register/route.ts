import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { clearAppAccessCookie } from '@/lib/server/auth/app-access-cookie';
import {
  clearPreSignupCookie,
  clearPreSignupVerification,
  consumePreSignupVerification,
  hashBirth,
} from '@/lib/server/auth/pre-signup';
import { clearSessionCookie } from '@/lib/server/auth/session';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface RegisterBody {
  loginId?: unknown;
  password?: unknown;
  nickname?: unknown;
  birth?: unknown;
  age?: unknown;
  studentYear?: unknown;
  department?: unknown;
  gender?: unknown;
  realName?: unknown;
  email?: unknown;
  university?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGender(value: string): 'male' | 'female' | '' {
  const lowered = value.toLowerCase();
  if (lowered === 'male' || lowered === 'm' || lowered === '남' || lowered === '남성') {
    return 'male';
  }
  if (lowered === 'female' || lowered === 'f' || lowered === '여' || lowered === '여성') {
    return 'female';
  }
  return '';
}

function toStudentYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}

function validationFail(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const preSignup = await consumePreSignupVerification(request);
  if (!preSignup) {
    const response = NextResponse.json(
      { ok: false, message: '인증이 만료되었습니다. 다시 인증해주세요.' },
      { status: 401 },
    );
    clearPreSignupCookie(response);
    return response;
  }

  let body: RegisterBody;
  try {
    body = await request.json() as RegisterBody;
  } catch {
    return validationFail('요청 형식을 확인해주세요.');
  }

  const loginId = normalizeString(body.loginId);
  const password = normalizeString(body.password);
  const nickname = normalizeString(body.nickname);
  const birth = normalizeString(body.birth);
  const department = normalizeString(body.department);
  const realName = normalizeString(body.realName);
  const email = normalizeString(body.email).toLowerCase();
  const university = normalizeString(body.university);
  const gender = normalizeGender(normalizeString(body.gender));
  const age = toInteger(body.age);
  const studentYear = toStudentYear(body.studentYear);

  if (!loginId || !password || !nickname || !birth || !age || !department || !realName || !email || !university || !gender || !studentYear) {
    return validationFail('회원가입 필드를 모두 입력해주세요.');
  }

  if (loginId.length < 4 || loginId.length > 100) {
    return validationFail('아이디는 4자 이상 100자 이하로 입력해주세요.');
  }

  if (password.length < 8) {
    return validationFail('비밀번호는 8자 이상이어야 합니다.');
  }

  if (!/^\d{6}$/.test(birth)) {
    return validationFail('생년월일 6자리를 입력해주세요.');
  }

  if (age < 1 || age > 100) {
    return validationFail('나이 범위를 확인해주세요.');
  }

  if (studentYear < 1 || studentYear > 8) {
    return validationFail('학년 범위를 확인해주세요.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return validationFail('이메일 형식을 확인해주세요.');
  }

  const [loginIdDuplicated, emailDuplicated, nicknameDuplicated, studentDuplicated] = await Promise.all([
    prisma.user.findUnique({ where: { login_id: loginId }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { nickname }, select: { id: true } }),
    prisma.user.findFirst({ where: { student_number: preSignup.studentNumber }, select: { id: true } }),
  ]);

  if (loginIdDuplicated) {
    return NextResponse.json({ ok: false, message: '이미 사용 중인 아이디입니다.' }, { status: 409 });
  }

  if (emailDuplicated) {
    return NextResponse.json({ ok: false, message: '이미 사용 중인 이메일입니다.' }, { status: 409 });
  }

  if (nicknameDuplicated) {
    return NextResponse.json({ ok: false, message: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
  }

  if (studentDuplicated) {
    return NextResponse.json({ ok: false, message: '이미 가입된 학번입니다. 로그인해주세요.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      login_id: loginId,
      real_name: realName,
      age,
      email,
      password_hash: passwordHash,
      birth,
      birth_hash: hashBirth(birth),
      nickname,
      gender,
      university,
      department,
      student_year: studentYear,
      student_number: preSignup.studentNumber,
    },
  });

  const response = NextResponse.json(
    {
      ok: true,
      registered: true,
      nextPath: '/login',
    },
    { status: 200 },
  );

  await clearPreSignupVerification(request);
  clearSessionCookie(response);
  clearAppAccessCookie(response);
  clearPreSignupCookie(response);
  return response;
}
