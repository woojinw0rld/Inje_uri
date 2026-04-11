import type { NextRequest } from 'next/server';
import { requireCurrentUser, type AuthContext } from '@/lib/server/auth/current-user';

export type AuthedHandler<T> = (request: NextRequest, auth: AuthContext) => Promise<T> | T;

export function withAuth<T>(handler: AuthedHandler<T>) {
  return async (request: NextRequest): Promise<T> => {
    const auth = await requireCurrentUser(request);
    return handler(request, auth);
  };
}

