/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  /** HTTP API proxy `^/node/` (не WebSocket) */
  readonly VITE_PROXY_TARGET?: string;
  /** WebSocket `/node/ws` → Bun (по умолчанию http://127.0.0.1:3020) */
  readonly VITE_WS_PROXY_TARGET?: string;
}
