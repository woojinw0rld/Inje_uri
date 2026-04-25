export const BUS_LOGIN_ENDPOINT = 'https://bus.inje.ac.kr/app/api.php?ctrl=Member&action=Login&lang=1';
export const BUS_INJE_CHECK_ENDPOINT = 'https://bus.inje.ac.kr/app/api.php?ctrl=Member&action=InjeCheck';

export const APP_AUTH_COOKIE_NAME = 'injeuri_bus_auth';
export const APP_AUTH_COOKIE_VALUE = '1';
export const APP_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;
export const PRE_SIGNUP_COOKIE_NAME = 'injeuri_pre_signup';
export const PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS = 60 * 10;
export const INJE_CHECK_FAIL_MESSAGE = '입력한 정보를 찾을수 없습니다.';
export const INJE_CHECK_ALREADY_REGISTERED_MESSAGE = '이미 등록된 학번/사번입니다.';

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
