import { createHash } from 'node:crypto';
import { apiErrors } from '@/lib/server/api/errors';

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw apiErrors.validation('전화번호를 입력해주세요.');
  }

  const onlyPhoneChars = trimmed.replace(/[\s-]/g, '');
  if (onlyPhoneChars.startsWith('+')) {
    const digits = onlyPhoneChars.slice(1);
    if (!/^\d{8,15}$/.test(digits)) {
      throw apiErrors.validation('전화번호 형식을 확인해주세요.');
    }

    return `+${digits}`;
  }

  if (!/^\d{8,15}$/.test(onlyPhoneChars)) {
    throw apiErrors.validation('전화번호 형식을 확인해주세요.');
  }

  if (onlyPhoneChars.startsWith('0')) {
    return `+82${onlyPhoneChars.slice(1)}`;
  }

  if (onlyPhoneChars.startsWith('82')) {
    return `+${onlyPhoneChars}`;
  }

  return `+${onlyPhoneChars}`;
}

export function hashPhoneNumber(normalizedPhoneNumber: string): string {
  return createHash('sha256').update(normalizedPhoneNumber).digest('hex');
}

