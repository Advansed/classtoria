/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vitejs.dev/config/
// plugin-legacy только при build — в dev не нужен
// Прокси только ^/node/... (со слэшем после node). Ключ '/node' ловит /node_modules → HTML и ломает env.mjs на ionic serve :8100
// VITE_PROXY_TARGET — при необходимости API с прода: https://classtoria.ru
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Без .env WS/HTTP «/node/» уходили на прод → 404 на /node/ws. Локальная разработка — Bun на 3020.
  const proxyTarget =
    env.VITE_PROXY_TARGET?.trim() || 'http://localhost:3020'

  const nodeApiProxy: ProxyOptions = {
    target: proxyTarget,
    changeOrigin: true,
    secure: proxyTarget.startsWith('https'),
    ws: true,
  }

  return {
    base: '/',
    plugins: [react(), ...(command === 'build' ? [legacy()] : [])],
    server: {
      // Чтобы с телефона/другого ПК в LAN: http://<IP-этого-компьютера>:8100
      host: true,
      proxy: {
        '^/node/': nodeApiProxy,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
