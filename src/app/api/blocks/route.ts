/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

interface BlockRequestBody {
  blockedUserId?: unknown;
  reason?: unknown;
}

function parseBlockedUserId(value: unknown): number {
  const blockedUserId = typeof value === 'number' ? value : Number.NaN;

  if (!blockedUserId || Number.isNaN(blockedUserId)) {
    throw apiErrors.validation('blockedUserId 형식을 확인해주세요.');
  }

  return blockedUserId;
}

export const GET = withAuth(async (_request: NextRequest, auth) => {
  const blocks = await prisma.block.findMany({
    where: {
      blocker_user_id: auth.user.id,
      unblocked_at: null,
    },
    orderBy: { created_at: 'desc' },
    include: {
      blocked_user: {
        select: {
          id: true,
          nickname: true,
          status: true,
        },
      },
    },
  });

  return ok({
    blocks: blocks.map((block: any) => ({
      id: block.id,
      blockedUserId: block.blocked_user_id,
      reason: block.reason,
      createdAt: block.created_at.toISOString(),
      blockedUser: block.blocked_user,
    })),
  });
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: BlockRequestBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const blockedUserId = parseBlockedUserId(body.blockedUserId);
  if (blockedUserId === auth.user.id) {
    throw apiErrors.validation('본인은 차단할 수 없습니다.');
  }

  const blockedUser = await prisma.user.findUnique({
    where: { id: blockedUserId },
    select: { id: true },
  });
  if (!blockedUser) {
    throw apiErrors.notFound('차단할 사용자를 찾을 수 없습니다.');
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;

  const existing = await prisma.block.findFirst({
    where: {
      blocker_user_id: auth.user.id,
      blocked_user_id: blockedUserId,
    },
  });

  let block;
  if (!existing) {
    block = await prisma.block.create({
      data: {
        blocker_user_id: auth.user.id,
        blocked_user_id: blockedUserId,
        reason,
      },
    });
  } else if (existing.unblocked_at === null) {
    throw apiErrors.conflict('이미 차단한 사용자입니다.');
  } else {
    block = await prisma.block.update({
      where: { id: existing.id },
      data: {
        reason,
        created_at: new Date(),
        unblocked_at: null,
      },
    });
  }

  return ok({
    block: {
      id: block.id,
      blockedUserId: block.blocked_user_id,
      reason: block.reason,
      createdAt: block.created_at.toISOString(),
    },
  }, { status: 201 });
});

export const DELETE = withAuth(async (request: NextRequest, auth) => {
  let body: BlockRequestBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const blockedUserId = parseBlockedUserId(body.blockedUserId);
  const block = await prisma.block.findFirst({
    where: {
      blocker_user_id: auth.user.id,
      blocked_user_id: blockedUserId,
      unblocked_at: null,
    },
  });

  if (!block) {
    throw apiErrors.notFound('차단 내역을 찾을 수 없습니다.');
  }

  await prisma.block.update({
    where: { id: block.id },
    data: { unblocked_at: new Date() },
  });

  return ok({ unblockedUserId: blockedUserId });
});
