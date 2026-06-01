export const API_BASE_URL = 'https://classtoria.ru/node/';

/** Локальная разработка (vite/ionic :8100, LAN IP) — WS через прокси на Bun :3020 */
function isLocalAppHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  ) {
    return true;
  }
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/**
 * WebSocket: локально — `ws(s)://<host>/node/ws` (vite proxy → Bun).
 * На проде — из `API_BASE_URL` или `VITE_WS_URL`.
 */
/** URL WebSocket для текущей страницы (локально — всегда через vite/ionic proxy). */
export function getClasstoriaWsUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname, protocol, host } = window.location;
    if (isLocalAppHost(hostname) || import.meta.env.DEV) {
      const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${host}/node/ws`;
    }
  }

  const explicit = import.meta.env.VITE_WS_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const u = new URL(API_BASE_URL);
  const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  const path = `${u.pathname.replace(/\/?$/, '')}/ws`;
  return `${wsProto}//${u.host}${path}`;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string | null;
  token?: string;
  phone?: string;
  password?: string;
  passwordhash?: string;
  passwordHash?: string;
  auth_code?: string;
  authCode?: string;
  user_id?: string | number;
  user?: {
    name?: string;
    phone?: string;
    email?: string;
    image?: string;
    role?: string;
  };
  /** Список детей родителя (таблица Childrens), приходит с login. */
  childrens?: unknown;
  children?: unknown;
  /** Избранные события (ClassEvent[]), приходит с login. */
  favorites?: unknown;
  favorite?: unknown;
}

export async function get<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(options.headers ?? {}),
    },
    signal: options.signal,
  });

  return (await res.json()) as ApiResponse<T>;
}

export async function post<T = unknown, B = unknown>(
  path: string,
  body: B,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  return (await res.json()) as ApiResponse<T>;
}

/** POST-запрос к API (например `api('profile', { token })`). */
export const api = post;
