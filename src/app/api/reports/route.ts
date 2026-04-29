import type { NextRequest } from 'next/server';
import { apiErrors } from '@/lib/server/api/errors';
import { ok } from '@/lib/server/api/response';
import { withAuth } from '@/lib/server/auth/middleware';
import { prisma } from '@/lib/server/prisma';

export const runtime = 'nodejs';

const VALID_REPORT_TARGET_TYPES = new Set(['user', 'feed', 'feed_comment', 'chat_room', 'message']);

interface ReportBody {
  targetType?: unknown;
  targetId?: unknown;
  reasonType?: unknown;
  description?: unknown;
  alsoBlock?: unknown;
}

async function assertReportTargetExists(targetType: string, targetId: number, reporterUserId: number) {
  switch (targetType) {
    case 'user': {
      if (targetId === reporterUserId) {
        throw apiErrors.validation('본인은 신고할 수 없습니다.');
      }

      const target = await prisma.user.findFirst({
        where: {
          id: targetId,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!target) {
        throw apiErrors.targetNotFound('신고할 사용자를 찾을 수 없습니다.');
      }
      return;
    }

    case 'feed': {
      const target = await prisma.selfDateFeed.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) {
        throw apiErrors.targetNotFound('신고할 피드를 찾을 수 없습니다.');
      }
      return;
    }

    case 'feed_comment': {
      const target = await prisma.feedComment.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) {
        throw apiErrors.targetNotFound('신고할 댓글을 찾을 수 없습니다.');
      }
      return;
    }

    case 'chat_room': {
      const target = await prisma.chatRoom.findFirst({
        where: {
          id: targetId,
          participants: {
            some: { user_id: reporterUserId },
          },
        },
        select: { id: true },
      });
      if (!target) {
        throw apiErrors.targetNotFound('신고할 채팅방을 찾을 수 없습니다.');
      }
      return;
    }

    case 'message': {
      const target = await prisma.message.findFirst({
        where: {
          id: targetId,
          chat_room: {
            participants: {
              some: { user_id: reporterUserId },
            },
          },
        },
        select: { id: true },
      });
      if (!target) {
        throw apiErrors.targetNotFound('신고할 메시지를 찾을 수 없습니다.');
      }
      return;
    }

    default:
      throw apiErrors.validation('지원하지 않는 신고 대상 타입입니다.');
  }
}

async function ensureActiveBlock(blockerUserId: number, blockedUserId: number, reason: string) {
  const existing = await prisma.block.findFirst({
    where: {
      blocker_user_id: blockerUserId,
      blocked_user_id: blockedUserId,
    },
  });

  if (!existing) {
    await prisma.block.create({
      data: {
        blocker_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        reason,
      },
    });
    return;
  }

  if (existing.unblocked_at !== null) {
    await prisma.block.update({
      where: { id: existing.id },
      data: {
        unblocked_at: null,
        created_at: new Date(),
        reason,
      },
    });
  }
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  let body: ReportBody;

  try {
    body = await request.json();
  } catch {
    throw apiErrors.validation('요청 형식을 확인해주세요.');
  }

  const targetType = typeof body.targetType === 'string' ? body.targetType.trim() : '';
  const targetId = typeof body.targetId === 'number' ? body.targetId : Number.NaN;
  const reasonType = typeof body.reasonType === 'string' ? body.reasonType.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const alsoBlock = body.alsoBlock === true;

  if (!targetType || Number.isNaN(targetId) || !Number.isInteger(targetId) || targetId <= 0 || !reasonType) {
    throw apiErrors.validation('targetType, targetId, reasonType를 확인해주세요.');
  }

  if (!VALID_REPORT_TARGET_TYPES.has(targetType)) {
    throw apiErrors.validation('지원하지 않는 신고 대상 타입입니다.');
  }

  await assertReportTargetExists(targetType, targetId, auth.user.id);

  const report = await prisma.report.create({
    data: {
      reporter_user_id: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      reason_type: reasonType,
      description,
    },
  });

  if (alsoBlock && targetType === 'user') {
    await ensureActiveBlock(auth.user.id, targetId, `report:${reasonType}`);
  }

  return ok({
    report: {
      id: report.id,
      targetType: report.target_type,
      targetId: report.target_id,
      reasonType: report.reason_type,
      status: report.status,
      createdAt: report.created_at.toISOString(),
    },
  }, { status: 201 });
});
