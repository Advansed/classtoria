import { api, type ApiResponse } from '../../../api';
import {
  fetchSignedImageUrl,
  isPresignedObjectUrl,
  normalizeStoredImageKey,
  putFileToSignedUrl,
  withImageCacheBust,
} from '../../PersonalPage/components/avatarUpload';
import { deleteImage } from '../classesApi';
import type { ClassImage } from '../types';
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

const pairStoragePath = (primary: string, siblingSuffix: string, ownSuffix: string): string => {
  const trimmed = primary.trim();
  if (!trimmed) {
    return '';
  }
  if (new RegExp(`${ownSuffix}$`, 'i').test(trimmed)) {
    return trimmed.replace(new RegExp(`${ownSuffix}$`, 'i'), siblingSuffix);
  }
  return '';
};

/** Ключи S3 для file.jpg и preview.jpg (как в upload_url). */
export const resolveImageStorageFilenames = (
  img: ClassImage,
  ctx: { classId: string; eventId: string; collectionId: string },
): string[] => {
  let file = normalizeStoredImageKey(img.file);
  let preview = normalizeStoredImageKey(img.preview);

  if (file && !preview) {
    preview = pairStoragePath(file, '/preview.jpg', '/file.jpg');
  } else if (preview && !file) {
    file = pairStoragePath(preview, '/file.jpg', '/preview.jpg');
  }

  const imageId = img.imageId?.trim() ?? '';
  if (imageId && (!file || !preview)) {
    const base = buildCollectionImageBasePath(
      ctx.classId,
      ctx.eventId,
      ctx.collectionId,
      imageId,
    );
    file = file || `${base}/file.jpg`;
    preview = preview || `${base}/preview.jpg`;
  }

  return [...new Set([file, preview].filter(Boolean))];
};

/** image_id из поля API или из пути `.../collectionId/imageId/file.jpg`. */
export const resolveCollectionImageId = (
  img: ClassImage,
  fallbackImageId = '',
): string => {
  const fromField = img.imageId?.trim() ?? '';
  if (fromField) {
    return fromField;
  }

  for (const raw of [img.file, img.preview]) {
    const key = normalizeStoredImageKey(raw);
    const segments = key.split('/').filter(Boolean);
    if (segments.length >= 4) {
      return segments[3];
    }
  }

  return fallbackImageId.trim();
};

export type DeleteCollectionImageContext = {
  classId: string;
  eventId: string;
  collectionId: string;
};

/** `del_image` + при возможности `del_files3` для file/preview. */
export const deleteCollectionImage = async (
  token: string,
  img: ClassImage,
  ctx: DeleteCollectionImageContext,
  fallbackImageId = '',
): Promise<string> => {
  const imageId = resolveCollectionImageId(img, fallbackImageId);
  if (!imageId) {
    throw new Error('Нет image_id для удаления');
  }

  logUploadAction('del_image: запрос', { imageId });

  const res = await deleteImage({ token, imageId });
  if (!res.success) {
    const err = res.message?.trim() || 'Не удалось удалить фото';
    logUploadError('del_image', err);
    throw new Error(err);
  }

  logUploadOk('del_image', { imageId });

  const filenames = resolveImageStorageFilenames(
    { ...img, imageId },
    ctx,
  );

  if (filenames.length > 0) {
    try {
      await deleteImageFilesFromStorage(token, filenames);
    } catch (error) {
      logUploadError('del_files3 после del_image', error);
    }
  }

  return imageId;
};

/** `del_files3 { token, filename }` — удаление объекта в хранилище. */
export const deleteFileFromStorage = async (token: string, filename: string): Promise<void> => {
  const trimmedToken = token.trim();
  const trimmedFilename = filename.trim();
  if (!trimmedToken || !trimmedFilename) {
    throw new Error('Нет данных для удаления файла');
  }

  logUploadAction('del_files3: запрос', { filename: trimmedFilename });

  const res: ApiResponse<unknown> = await api('del_files3', {
    token: trimmedToken,
    filename: trimmedFilename,
  });

  logUploadApi('del_files3: ответ', res);

  if (!res.success) {
    const err = res.message?.trim() || 'Не удалось удалить файл';
    logUploadError('del_files3', err);
    throw new Error(err);
  }

  logUploadOk('del_files3', { filename: trimmedFilename });
};

export const deleteImageFilesFromStorage = async (
  token: string,
  filenames: string[],
): Promise<void> => {
  const unique = [...new Set(filenames.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error('Не удалось определить путь к файлу');
  }

  for (const filename of unique) {
    await deleteFileFromStorage(token, filename);
  }
};

export const uploadFileToStorage = async (
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

/** @deprecated Используйте {@link uploadFileToStorage}. */
export const uploadJpegToStorage = uploadFileToStorage;
