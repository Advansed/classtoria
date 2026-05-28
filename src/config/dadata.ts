/**
 * Публичный API-токен DaData для подсказок в браузере (`VITE_DADATA_TOKEN`).
 * Секретный ключ DaData — только на сервере, не в Vite/React.
 */
export function getDadataToken(): string {
  return import.meta.env.VITE_DADATA_TOKEN?.trim() ?? '';
}
