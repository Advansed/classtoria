/** Базовый путь раздела «ЛК класса» в личном кабинете. */
export const CLASSES_BASE = '/personal/class';

export const CLASSES_CABINET = `${CLASSES_BASE}/cabinet`;

export const CLASSES_WHITELIST = `${CLASSES_BASE}/whitelist`;

export const CLASSES_UPLOAD = `${CLASSES_BASE}/upload`;

export const CLASSES_EVENT_CREATE = `${CLASSES_BASE}/event-create`;

export const CLASSES_COLLECTION_UPLOAD = `${CLASSES_BASE}/collection-upload`;

export const CLASSES_COLLECTION_CREATE = `${CLASSES_BASE}/collection-create`;

export const CLASSES_EVENT_VIEW = `${CLASSES_BASE}/event`;

export const CLASSES_COLLECTION_VIEW = `${CLASSES_BASE}/collection`;

export const CLASSES_IMAGE_VIEW = `${CLASSES_BASE}/image`;

/** Публичный просмотр события по ссылке (без авторизации). */
export const PUBLIC_EVENT_VIEW = '/event/:eventId';

export const PUBLIC_COLLECTION_VIEW = '/event/:eventId/collection/:collectionId';

export const PUBLIC_IMAGE_VIEW =
  '/event/:eventId/collection/:collectionId/photo/:imageId';

export const publicEventPath = (eventId: string): string => {
  const id = eventId.trim();
  return id ? `/event/${encodeURIComponent(id)}` : '';
};

export const publicCollectionPath = (
  eventId: string,
  collectionId: string,
): string => {
  const ev = eventId.trim();
  const col = collectionId.trim();
  if (!ev || !col) {
    return '';
  }
  return `/event/${encodeURIComponent(ev)}/collection/${encodeURIComponent(col)}`;
};

export const publicCollectionIndexPath = (eventId: string, index: number): string =>
  publicCollectionPath(eventId, `idx-${index}`);

export const publicImagePath = (
  eventId: string,
  collectionId: string,
  imageId: string,
): string => {
  const ev = eventId.trim();
  const col = collectionId.trim();
  const img = imageId.trim();
  if (!ev || !col || !img) {
    return '';
  }
  return `/event/${encodeURIComponent(ev)}/collection/${encodeURIComponent(col)}/photo/${encodeURIComponent(img)}`;
};

export const publicImageIndexPath = (
  eventId: string,
  collectionId: string,
  index: number,
): string => publicImagePath(eventId, collectionId, `idx-${index}`);

export const buildEventShareUrl = (eventId: string): string => {
  const path = publicEventPath(eventId);
  if (!path) {
    return '';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
};
