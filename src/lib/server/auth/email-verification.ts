import { createHash, randomInt } from 'node:crypto';

export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 10;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isSchoolEmail(email: string): boolean {
  return /@([a-z0-9-]+\.)*inje\.ac\.kr$/i.test(email);
}

export function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

