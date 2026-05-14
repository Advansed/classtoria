const AUTH_PHONE_KEY = 'classtoria_auth_phone_v1';
const AUTH_PASSWORD_HASH_KEY = 'classtoria_auth_password_hash_v2';
const LOGGED_IN_KEY = 'classtoria_logged_in_v1';
const PATH = '/';

const maxAgeSec = 60 * 60 * 24 * 400;

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 11);
}

function writeCookie(name: string, value: string): void {
  const expires = maxAgeSec;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${PATH}; Max-Age=${expires}; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(';')) {
    const t = part.trim();
    if (t.startsWith(prefix)) {
      return decodeURIComponent(t.slice(prefix.length));
    }
  }
  return null;
}

export function savePasswordHashCookies(phoneDisplay: string, passwordHash: string): void {
  const digits = normalizePhoneDigits(phoneDisplay);
  if (!digits || !passwordHash.trim()) {
    return;
  }
  writeCookie(AUTH_PHONE_KEY, digits);
  writeCookie(AUTH_PASSWORD_HASH_KEY, passwordHash.trim());
}

export const saveAuthCookies = savePasswordHashCookies;

export function readStoredAuth(): { phoneDigits: string; passwordHash: string } | null {
  const phoneDigits = readCookie(AUTH_PHONE_KEY);
  const passwordHash =
    readCookie(AUTH_PASSWORD_HASH_KEY) ?? readCookie('classtoria_auth_pw_hash_v1');
  if (!phoneDigits || !passwordHash) {
    return null;
  }
  return { phoneDigits, passwordHash };
}

/** Успешный `post('login')` — отдельно от сохранения ключа на устройстве. */
export function setLoggedInCookie(): void {
  writeCookie(LOGGED_IN_KEY, '1');
}

export function readIsLoggedIn(): boolean {
  return readCookie(LOGGED_IN_KEY) === '1';
}

export function clearAuthCookies(): void {
  document.cookie = `${encodeURIComponent(AUTH_PHONE_KEY)}=; Path=${PATH}; Max-Age=0; SameSite=Lax`;
  document.cookie = `${encodeURIComponent(AUTH_PASSWORD_HASH_KEY)}=; Path=${PATH}; Max-Age=0; SameSite=Lax`;
  document.cookie = `${encodeURIComponent('classtoria_auth_pw_hash_v1')}=; Path=${PATH}; Max-Age=0; SameSite=Lax`;
  document.cookie = `${encodeURIComponent(LOGGED_IN_KEY)}=; Path=${PATH}; Max-Age=0; SameSite=Lax`;
}

/** Последний введённый номер (localStorage) — подстановка в форме авторизации. */
const LS_LAST_PHONE_DISPLAY = 'classtoria_last_phone_display_v1';

export function readLastPhoneDisplay(): string {
  if (typeof localStorage === 'undefined') {
    return '';
  }
  try {
    return localStorage.getItem(LS_LAST_PHONE_DISPLAY) ?? '';
  } catch {
    return '';
  }
}

export function saveLastPhoneDisplay(phoneDisplay: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    const t = phoneDisplay.trim();
    if (!t) {
      localStorage.removeItem(LS_LAST_PHONE_DISPLAY);
      return;
    }
    localStorage.setItem(LS_LAST_PHONE_DISPLAY, t);
  } catch {
    /* quota / private mode */
  }
}
