import type { NextRequest } from 'next/server';
import { toErrorResponse } from '@/lib/server/api/response';
import { requireCurrentUser, type AuthContext } from '@/lib/server/auth/current-user';

export type AuthedHandler<T> = (request: NextRequest, auth: AuthContext) => Promise<T> | T;

export function withAuth<T>(handler: AuthedHandler<T>) {
  return async (request: NextRequest): Promise<T | ReturnType<typeof toErrorResponse>> => {
    try {
      const auth = await requireCurrentUser(request);
      return handler(request, auth);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
