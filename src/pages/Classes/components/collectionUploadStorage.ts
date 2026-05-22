import { api, type ApiResponse } from '../../../api';
import {
  fetchSignedImageUrl,
  isPresignedObjectUrl,
  putFileToSignedUrl,
  withImageCacheBust,
} from '../../PersonalPage/components/avatarUpload';
import { logUploadAction, logUploadApi, logUploadError, logUploadOk } from './collectionUploadLog';

type UploadUrlData = {
  upload_url?: string;
  uploadUrl?: string;
  public_url?: string;
  publicUrl?: string;
};

const pickString = (obj: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readUploadPayload = (source: unknown): { uploadUrl: string; publicUrl: string } => {
  const record = asRecord(source);
  if (!record) {
    return { uploadUrl: '', publicUrl: '' };
  }

  const layers: Record<string, unknown>[] = [record];
  const data = asRecord(record.data);
  if (data) {
    layers.push(data);
    const inner = asRecord(data.data);
    if (inner) {
      layers.push(inner);
    }
  }

  let uploadUrl = '';
  let publicUrl = '';
  for (const layer of layers) {
    if (!uploadUrl) {
      uploadUrl = pickString(layer, ['upload_url', 'uploadUrl', 'signed_url', 'url']);
    }
    if (!publicUrl) {
      publicUrl = pickString(layer, [
        'public_url',
        'publicUrl',
        'view_url',
        'viewUrl',
        'fileurl',
        'fileUrl',
        'previewurl',
        'previewUrl',
      ]);
    }
  }

  return { uploadUrl, publicUrl };
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

/** URL для <img>: public_url с API или подписанный GET по ключу в хранилище. */
export const resolveImagePublicUrl = async (
  token: string,
  publicUrlFromApi: string,
  storagePath: string,
): Promise<string> => {
  const fromApi = publicUrlFromApi.trim();
  if (fromApi && isHttpUrl(fromApi)) {
    return isPresignedObjectUrl(fromApi) ? fromApi : withImageCacheBust(fromApi);
  }

  const key = (fromApi || storagePath).trim();
  if (!key || !token.trim()) {
    return fromApi;
  }

  try {
    return await fetchSignedImageUrl(token, key);
  } catch {
    return fromApi;
  }
};

/** `upload_url { token, filename }` → upload_url + public_url. */
export const fetchStorageUploadUrl = async (
  token: string,
  filename: string,
): Promise<{ uploadUrl: string; publicUrl: string }> => {
  logUploadAction('upload_url: запрос', { filename });

  const res: ApiResponse<UploadUrlData> = await api('upload_url', {
    token: token.trim(),
    filename: filename.trim(),
  });

  logUploadApi('upload_url: ответ', res);

  if (!res.success) {
    const err = res.message?.trim() || 'Не удалось получить ссылку для загрузки';
    logUploadError('upload_url', err);
    throw new Error(err);
  }

  const { uploadUrl, publicUrl } = readUploadPayload(res);
  if (!uploadUrl) {
    logUploadError('upload_url', 'Сервер не вернул upload_url');
    throw new Error('Сервер не вернул upload_url');
  }

  logUploadOk('upload_url', {
    filename,
    hasPublicUrl: Boolean(publicUrl),
    uploadUrlPrefix: uploadUrl.slice(0, 48),
  });

  return { uploadUrl, publicUrl };
};

export const buildCollectionImageBasePath = (
  classId: string,
  eventId: string,
  collectionId: string,
  imageId: string,
): string => `${classId.trim()}/${eventId.trim()}/${collectionId.trim()}/${imageId.trim()}`;

export const uploadJpegToStorage = async (
  token: string,
  storagePath: string,
  file: File,
): Promise<string> => {
  logUploadAction('PUT в хранилище: подготовка', {
    path: storagePath,
    sizeBytes: file.size,
    type: file.type,
  });

  try {
    const { uploadUrl, publicUrl } = await fetchStorageUploadUrl(token, storagePath);
    await putFileToSignedUrl(uploadUrl, file);
    const stored = publicUrl.trim() || storagePath.trim();
    logUploadOk('PUT в хранилище', {
      path: storagePath,
      publicUrl: stored || '(пусто)',
    });
    return stored;
  } catch (error) {
    logUploadError(`PUT в хранилище (${storagePath})`, error);
    throw error;
  }
};
