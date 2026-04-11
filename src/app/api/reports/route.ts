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

  if (!targetType || Number.isNaN(targetId) || !reasonType) {
    throw apiErrors.validation('targetType, targetId, reasonType를 확인해주세요.');
  }

  if (!VALID_REPORT_TARGET_TYPES.has(targetType)) {
    throw apiErrors.validation('지원하지 않는 신고 대상 타입입니다.');
  }

  const report = await prisma.report.create({
    data: {
      reporter_user_id: auth.user.id,
      target_type: targetType,
      target_id: targetId,
      reason_type: reasonType,
      description,
    },
  });

  if (alsoBlock && targetType === 'user' && targetId !== auth.user.id) {
    const existing = await prisma.block.findFirst({
      where: {
        blocker_user_id: auth.user.id,
        blocked_user_id: targetId,
      },
    });

    if (!existing) {
      await prisma.block.create({
        data: {
          blocker_user_id: auth.user.id,
          blocked_user_id: targetId,
          reason: `report:${reasonType}`,
        },
      });
    } else if (existing.unblocked_at !== null) {
      await prisma.block.update({
        where: { id: existing.id },
        data: {
          unblocked_at: null,
          created_at: new Date(),
          reason: `report:${reasonType}`,
        },
      });
    }
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
