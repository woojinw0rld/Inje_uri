import type { User } from '@/generated/prisma/client';

export interface AuthUserSummary {
  id: number;
  nickname: string;
  status: User['status'];
  onboardingCompleted: boolean;
}

export function toAuthUserSummary(user: User): AuthUserSummary {
  return {
    id: user.id,
    nickname: user.nickname,
    status: user.status,
    onboardingCompleted: user.onboarding_completed,
  };
}

