import { prisma } from '@/lib/server/prisma';

export async function getBlockedUserIdSet(userId: number): Promise<Set<number>> {
  const rows = await prisma.block.findMany({
    where: {
      unblocked_at: null,
      OR: [
        { blocker_user_id: userId },
        { blocked_user_id: userId },
      ],
    },
    select: {
      blocker_user_id: true,
      blocked_user_id: true,
    },
  });

  const blockedSet = new Set<number>();

  for (const row of rows) {
    if (row.blocker_user_id === userId) {
      blockedSet.add(row.blocked_user_id);
    } else {
      blockedSet.add(row.blocker_user_id);
    }
  }

  return blockedSet;
}

export async function filterAllowedCandidateUserIds(
  viewerUserId: number,
  candidateUserIds: number[],
): Promise<number[]> {
  if (candidateUserIds.length === 0) {
    return [];
  }

  const blockedSet = await getBlockedUserIdSet(viewerUserId);

  const users = await prisma.user.findMany({
    where: {
      id: { in: candidateUserIds },
      status: 'active',
      deleted_at: null,
    },
    select: { id: true },
  });

  return users
    .map((user) => user.id)
    .filter((userId) => !blockedSet.has(userId));
}

