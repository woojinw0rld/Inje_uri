export const BUS_LOGIN_ENDPOINT = 'https://bus.inje.ac.kr/app/api.php?ctrl=Member&action=Login&lang=1';

export const APP_AUTH_COOKIE_NAME = 'injeuri_bus_auth';
export const APP_AUTH_COOKIE_VALUE = '1';
export const APP_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

const PROTECTED_APP_PATH_PREFIXES = [
  '/match',
  '/interest',
  '/chat',
  '/self-date',
  '/my',
] as const;

export function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_APP_PATH_PREFIXES.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}
