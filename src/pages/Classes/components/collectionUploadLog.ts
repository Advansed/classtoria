const TAG = '[collection-upload]';

const safePayload = (value: unknown): unknown => {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  const o = { ...(value as Record<string, unknown>) };
  if (typeof o.token === 'string') {
    o.token = '***';
  }
  return o;
};

/** Начало действия. */
export const logUploadAction = (step: string, detail?: Record<string, unknown>): void => {
  if (detail) {
    console.log(TAG, step, detail);
  } else {
    console.log(TAG, step);
  }
};

/** Успешный результат действия. */
export const logUploadOk = (step: string, result?: Record<string, unknown>): void => {
  if (result) {
    console.log(TAG, `${step} ✓`, result);
  } else {
    console.log(TAG, `${step} ✓`);
  }
};

/** Ответ API. */
export const logUploadApi = (step: string, response: unknown): void => {
  console.log(TAG, `${step} (API)`, safePayload(response));
};

/** Ошибка. */
export const logUploadError = (step: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(TAG, `${step} ✗`, message, error);
};
