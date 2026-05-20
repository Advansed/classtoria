/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Локальная разработка — Bun на 3020. При необходимости можно переопределить через .env
  const proxyTarget =
    env.VITE_PROXY_TARGET?.trim() || 'http://127.0.0.1:3020'
  
  const wsProxyTarget =
    env.VITE_WS_PROXY_TARGET?.trim() || 'http://127.0.0.1:3020'

  // Настройка для обычных API запросов (HTTP)
  const nodeApiProxy: ProxyOptions = {
    target: proxyTarget,
    changeOrigin: true,
    secure: proxyTarget.startsWith('https'),
    ws: false, // Для обычного API веб-сокеты тут не нужны
  }

  // Настройка для WebSocket соединения
  const nodeWsProxy: ProxyOptions = {
    target: wsProxyTarget,
    changeOrigin: true,
    secure: false,
    ws: true,
    // Явно заменяем /node/ws на /ws, чтобы Bun сервер поймал чистый путь
    rewrite: (path) => path.replace(/^\/node\/ws/, '/ws'),
  }

  return {
    base: '/',
    plugins: [react(), ...(command === 'build' ? [legacy()] : [])],
    server: {
      // Чтобы можно было тестировать с телефона в одной Wi-Fi сети
      host: true,
      port: 8100,
      proxy: {
        // 1. Сначала ловим точный путь до веб-сокета
        '/node/ws': nodeWsProxy,
        
        // 2. Затем ловим все остальные API запросы.
        // Использование '/node/' (со слэшем) гарантирует, что Vite не заблокирует node_modules
        '/node/': nodeApiProxy,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})