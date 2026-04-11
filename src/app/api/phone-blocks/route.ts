/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';
import { hashPhoneNumber, normalizePhoneNumber } from '@/lib/server/users/phone-block';

export const runtime = 'nodejs';

interface PhoneBlockBody {
  phoneNumber?: unknown;
}

function parsePhoneNumber(value: unknown): string {
  if (typeof value !== 'string') {
    throw apiErrors.validation('phoneNumber 형식을 확인해주세요.');
  }

  return normalizePhoneNumber(value);
}

export const GET = withAuth(async (_request: NextRequest, auth) => {
  const phoneBlocks = await prisma.phoneBlock.findMany({
    where: {
      user_id: auth.user.id,
      unblocked_at: null,
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      phone_number_hash: true,
      created_at: true,
    },
  });

  return ok({
    phoneBlocks: phoneBlocks.map((item: any) => ({
      id: item.id,
      phoneNumberHash: item.phone_number_hash,
      createdAt: item.created_at.toISOString(),
    })),
  });
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: PhoneBlockBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const normalizedPhoneNumber = parsePhoneNumber(body.phoneNumber);
  const phoneNumberHash = hashPhoneNumber(normalizedPhoneNumber);

  const existing = await prisma.phoneBlock.findFirst({
    where: {
      user_id: auth.user.id,
      phone_number_hash: phoneNumberHash,
    },
  });

  let phoneBlock;
  if (!existing) {
    phoneBlock = await prisma.phoneBlock.create({
      data: {
        user_id: auth.user.id,
        phone_number_hash: phoneNumberHash,
      },
    });
  } else if (existing.unblocked_at === null) {
    throw apiErrors.conflict('이미 차단한 전화번호입니다.');
  } else {
    phoneBlock = await prisma.phoneBlock.update({
      where: { id: existing.id },
      data: {
        created_at: new Date(),
        unblocked_at: null,
      },
    });
  }

  return ok({
    phoneBlock: {
      id: phoneBlock.id,
      phoneNumberHash: phoneBlock.phone_number_hash,
      createdAt: phoneBlock.created_at.toISOString(),
    },
  }, { status: 201 });
});

export const DELETE = withAuth(async (request: NextRequest, auth) => {
  let body: PhoneBlockBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const normalizedPhoneNumber = parsePhoneNumber(body.phoneNumber);
  const phoneNumberHash = hashPhoneNumber(normalizedPhoneNumber);

  const target = await prisma.phoneBlock.findFirst({
    where: {
      user_id: auth.user.id,
      phone_number_hash: phoneNumberHash,
      unblocked_at: null,
    },
  });

  if (!target) {
    throw apiErrors.notFound('전화번호 차단 내역을 찾을 수 없습니다.');
  }

  await prisma.phoneBlock.update({
    where: { id: target.id },
    data: { unblocked_at: new Date() },
  });

  return ok({ unblockedPhoneNumberHash: phoneNumberHash });
});
