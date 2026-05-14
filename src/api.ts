export const API_BASE_URL = 'https://classtoria.ru/node/';

/**
 * WebSocket: в dev — `ws(s)://<ionic|vite>/node/ws` (прокси `^/node/` в vite, не цепляет `/node_modules`).
 * В prod — из `API_BASE_URL`. Явно: `VITE_WS_URL`.
 */
export function getClasstoriaWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/node/ws`;
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
