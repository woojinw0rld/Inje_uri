import type { AuthSession, User } from '@/generated/prisma/client';
import { apiErrors } from '@/lib/server/api/errors';
import { ACTIVE_USER_STATUS } from '@/lib/server/auth/constants';
import { hashSessionToken, readSessionTokenFromRequest, shouldTouchSession } from '@/lib/server/auth/session';
import { prisma } from '@/lib/server/prisma';

type SessionWithUser = AuthSession & { user: User };

export interface AuthContext {
  session: SessionWithUser;
  user: User;
  token: string;
}

export function ensureActiveUser(user: User) {
  const isDeleted = user.deleted_at !== null;
  const isNotActive = user.status !== ACTIVE_USER_STATUS;

  if (isDeleted || isNotActive) {
    throw apiErrors.forbidden('현재 계정 상태로는 접근할 수 없습니다.');
  }
}

export async function resolveCurrentUser(request: Request): Promise<AuthContext | null> {
  const token = readSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.authSession.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expires_at.getTime() <= Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (shouldTouchSession(session.last_seen_at)) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { last_seen_at: new Date() },
    }).catch(() => undefined);
  }

  return {
    session,
    user: session.user,
    token,
  };
}

export async function requireCurrentUser(request: Request): Promise<AuthContext> {
  const auth = await resolveCurrentUser(request);

  if (!auth) {
    throw apiErrors.unauthorized();
  }

  ensureActiveUser(auth.user);
  return auth;
}

