import { api, type ApiResponse } from '../../../api';

export const DEFAULT_PROFILE_IMAGE = '/images/auth-feature.png';

type SignedUrlPayload = {
  url?: string;
  signed_url?: string;
  signedUrl?: string;
  signedurl?: string;
  view_url?: string;
  viewUrl?: string;
  public_url?: string;
  publicUrl?: string;
  image?: string;
  upload_url?: string;
};

const pickString = (obj: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

/** Presigned S3 / Yandex Object Storage — нельзя менять query (ломается подпись). */
export const isPresignedObjectUrl = (url: string): boolean =>
  /X-Amz-Signature=|X-Amz-Algorithm=/i.test(url);

/** URL для показа (GET) из ответа get_signedurl. */
const readViewUrl = (source: unknown): string | null => {
  const record = asRecord(source);
  if (!record) {
    return null;
  }
  return pickString(record, [
    'view_url',
    'viewUrl',
    'signed_url',
    'signedUrl',
    'signedurl',
    'url',
    'image',
  ]);
};

/** URL для загрузки (PUT) из ответа upload_url. */
const readUploadUrl = (source: unknown): string | null => {
  const record = asRecord(source);
  if (!record) {
    return null;
  }
  return pickString(record, ['upload_url', 'signed_url', 'signedUrl', 'url']);
};

/** Ключ в S3 / путь в БД, например `uuid/avatar.jpeg`. */
export const isStorageImageKey = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed === DEFAULT_PROFILE_IMAGE ||
    trimmed.startsWith('/images/')
  ) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  return /^[^/]+\/avatar\.[a-z0-9]{2,5}$/i.test(trimmed) || trimmed.includes('/');
};

/**
 * Приводит значение image с API к ключу для БД.
 * Поддерживает ключ, pathname из public/signed URL.
 */
export const normalizeStoredImageKey = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === DEFAULT_PROFILE_IMAGE) {
    return '';
  }
  if (isStorageImageKey(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const path = parsed.pathname.replace(/^\/+/, '');
      const segments = path.split('/');
      const avatarIdx = segments.findIndex((s) => /^avatar\.[a-z0-9]+$/i.test(s));
      if (avatarIdx > 0) {
        return segments.slice(avatarIdx - 1).join('/');
      }
      if (avatarIdx === 0 && segments.length >= 2) {
        return segments.slice(0, 2).join('/');
      }
      return path;
    } catch {
      return '';
    }
  }
  return trimmed.replace(/^\/+/, '');
};

/** Cache-bust только для обычных URL; presigned не трогаем. */
export const withImageCacheBust = (url: string): string => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  if (isPresignedObjectUrl(url)) {
    return url;
  }
  const base = url.split('?')[0] ?? url;
  const separator = url.includes('?') ? '&' : '?';
  return `${base}${separator}v=${Date.now()}`;
};

export const extensionFromFile = (file: File): string => {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    return fromName;
  }
  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return byMime[file.type] ?? 'jpg';
};

export const avatarFilename = (userId: string, file: File): string => {
  const ext = extensionFromFile(file);
  return `${userId}/avatar.${ext}`;
};

export async function fetchSignedImageUrl(token: string, filename: string): Promise<string> {
  const res: ApiResponse<SignedUrlPayload> = await api('get_signedurl', { token, filename });

  if (!res.success) {
    throw new Error(res.message?.trim() || 'Не удалось получить ссылку на фото');
  }

  const url = readViewUrl(res.data) ?? readViewUrl(res);
  if (!url) {
    throw new Error('Сервер не вернул подписанный URL');
  }

  return url;
}

export async function fetchAvatarUploadUrl(
  token: string,
  filename: string,
): Promise<{ uploadUrl: string }> {
  const res: ApiResponse<SignedUrlPayload> = await api('upload_url', { token, filename });

  if (!res.success) {
    throw new Error(res.message?.trim() || 'Не удалось получить ссылку для загрузки');
  }

  const uploadUrl = readUploadUrl(res.data) ?? readUploadUrl(res);
  if (!uploadUrl) {
    throw new Error('Сервер не вернул URL для загрузки');
  }

  return { uploadUrl };
}

export async function putFileToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки файла (${response.status})`);
  }
}

export type AvatarUploadResult = {
  filename: string;
};

export async function uploadAvatarFile(
  token: string,
  userId: string,
  file: File,
): Promise<AvatarUploadResult> {
  const filename = avatarFilename(userId, file);
  const { uploadUrl } = await fetchAvatarUploadUrl(token, filename);
  await putFileToSignedUrl(uploadUrl, file);
  return { filename };
}

/** Аватар ребёнка при регистрации: ключ из `childImageKey` (поле `image` в Childrens). */
export async function uploadChildAvatarFile(
  token: string,
  filename: string,
  file: File,
): Promise<AvatarUploadResult> {
  const key = filename.trim();
  if (!key) {
    throw new Error('Не указан путь к файлу');
  }
  const { uploadUrl } = await fetchAvatarUploadUrl(token, key);
  await putFileToSignedUrl(uploadUrl, file);
  return { filename: key };
}

/** Подписанный URL для <img> или дефолтная картинка. */
export async function resolveAvatarSrc(
  token: string | null,
  imageKey: string | undefined,
): Promise<string> {
  const raw = (imageKey ?? '').trim();
  if (!raw) {
    return DEFAULT_PROFILE_IMAGE;
  }

  if (/^https?:\/\//i.test(raw)) {
    if (isPresignedObjectUrl(raw)) {
      return raw;
    }
    const keyFromUrl = normalizeStoredImageKey(raw);
    if (token && keyFromUrl && isStorageImageKey(keyFromUrl)) {
      return fetchSignedImageUrl(token, keyFromUrl);
    }
    return withImageCacheBust(raw);
  }

  if (!token || !isStorageImageKey(raw)) {
    return DEFAULT_PROFILE_IMAGE;
  }

  return fetchSignedImageUrl(token, raw);
}
