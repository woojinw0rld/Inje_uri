'use client';

import { FormEvent, startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';

interface LoginApiResponse {
  ok?: boolean;
  message?: string;
}

function resolveNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/match';
  }

  if (nextPath.startsWith('//')) {
    return '/match';
  }

  return nextPath;
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedStudentId = studentId.trim();
    const normalizedPassword = password.trim();

    if (!normalizedStudentId || !normalizedPassword) {
      const message = '학번과 비밀번호를 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: normalizedStudentId,
          password: normalizedPassword,
        }),
      });

      let payload: LoginApiResponse = {};

      try {
        payload = await response.json() as LoginApiResponse;
      } catch {
        payload = {};
      }

      if (response.ok && payload.ok) {
        showToast('로그인에 성공했어요.', 'success');
        const nextPath = resolveNextPath(searchParams.get('next'));
        startTransition(() => {
          router.replace(nextPath);
        });
        return;
      }

      const message = payload.message ?? '로그인이 거부되었습니다. 학번과 비밀번호를 확인해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } catch {
      const message = '로그인 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer withBottomNav={false} className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top,#e9f7fb_0%,#f3f7f8_45%,#eef3f4_100%)]">
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <Card variant="elevated" padding="lg" className="w-full border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border-light))] bg-white/95 backdrop-blur">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[26px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              인제대학교 통학버스 계정 로그인
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              학번과 비밀번호를 입력하면 통학버스 인증 결과에 따라 앱 이용 여부를 확인합니다.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="studentId" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                학번
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="예: 20231234"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                disabled={isSubmitting}
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-[var(--color-secondary)]/25 bg-[var(--color-secondary-light)]/70 px-3 py-2 text-sm text-[var(--color-secondary-dark)]"
              >
                {errorMessage}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              로그인
            </Button>
          </form>
        </Card>
      </main>
    </PageContainer>
  );
}
