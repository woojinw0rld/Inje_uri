'use client';

import { FormEvent, startTransition, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Button, Card, useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';

interface InjeCheckResponse {
  ok?: boolean;
  message?: string;
  nextStep?: 'login' | 'register';
}

function resolveNextQuery(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '';
  }

  return `?next=${encodeURIComponent(nextPath)}`;
}

export function InjeCheckPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [studentNumber, setStudentNumber] = useState('');
  const [birth, setBirth] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedStudentNumber = studentNumber.trim();
    const normalizedBirth = birth.trim();
    if (!normalizedStudentNumber || !normalizedBirth) {
      const message = '학번과 생년월일을 모두 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    if (!/^\d{6}$/.test(normalizedBirth)) {
      const message = '생년월일은 6자리 숫자로 입력해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/inje-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: normalizedStudentNumber,
          birth: normalizedBirth,
        }),
      });

      let payload: InjeCheckResponse = {};
      try {
        payload = await response.json() as InjeCheckResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.ok || !payload.nextStep) {
        const message = payload.message ?? '인증에 실패했습니다. 다시 시도해주세요.';
        setErrorMessage(message);
        showToast(message, 'error');
        return;
      }

      showToast('인증되었습니다.', 'success');
      const nextQuery = resolveNextQuery(searchParams.get('next'));
      const href = payload.nextStep === 'login'
        ? `/login${nextQuery}`
        : `/register${nextQuery}`;

      startTransition(() => {
        router.push(href);
      });
    } catch {
      const message = '인증 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      withBottomNav={false}
      className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top,#e9f7fb_0%,#f3f7f8_45%,#eef3f4_100%)]"
    >
      <main className="flex flex-1 items-center px-[var(--page-padding-x)] py-10">
        <Card
          variant="elevated"
          padding="lg"
          className="w-full border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border-light))] bg-white/95 backdrop-blur"
        >
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
              {APP_NAME}
            </p>
            <h1 className="mt-2 break-keep text-[26px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              학번 인증
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              학번과 생년월일을 입력해 인증을 진행해주세요.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="studentNumber" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                학번
              </label>
              <input
                id="studentNumber"
                name="studentNumber"
                type="text"
                inputMode="numeric"
                value={studentNumber}
                onChange={(event) => setStudentNumber(event.target.value)}
                placeholder="예: 20231234"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="birth" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">
                생년월일 (6자리)
              </label>
              <input
                id="birth"
                name="birth"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={birth}
                onChange={(event) => setBirth(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="예: 020408"
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
              인증
            </Button>
          </form>
        </Card>
      </main>
    </PageContainer>
  );
}
