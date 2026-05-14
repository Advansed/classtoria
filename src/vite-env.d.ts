/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  /** Цель прокси `^/node/` в dev (по умолчанию classtoria.ru) */
  readonly VITE_PROXY_TARGET?: string;
}
