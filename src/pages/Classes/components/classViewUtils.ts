import type { ClassCollection, ClassEvent, ClassImage } from '../types';
import { collectionLabel } from './collectionFormUtils';

export const findEventInList = (
  events: ClassEvent[],
  eventId: string,
  eventIndex: number | undefined,
): ClassEvent | undefined => {
  if (eventId) {
    const byId = events.find((ev) => ev.id === eventId);
    if (byId) {
      return byId;
    }
  }
  if (eventIndex != null && eventIndex >= 0 && eventIndex < events.length) {
    return events[eventIndex];
  }
  return undefined;
};

export const findCollectionInEvent = (
  event: ClassEvent | undefined,
  collectionId: string,
  collectionIndex: number | undefined,
): ClassCollection | undefined => {
  const collections = event?.collections ?? [];
  if (collectionId) {
    const byId = collections.find((col) => col.id === collectionId);
    if (byId) {
      return byId;
    }
  }
  if (collectionIndex != null && collectionIndex >= 0 && collectionIndex < collections.length) {
    return collections[collectionIndex];
  }
  return undefined;
};

export const findImageInCollection = (
  collection: ClassCollection | undefined,
  imageId: string,
  imageIndex: number | undefined,
): ClassImage | undefined => {
  const images = collection?.images ?? [];
  if (imageId) {
    const byId = images.find((img) => img.imageId === imageId);
    if (byId) {
      return byId;
    }
  }
  if (imageIndex != null && imageIndex >= 0 && imageIndex < images.length) {
    return images[imageIndex];
  }
  return undefined;
};

export const imageThumbRaw = (img: ClassImage): string =>
  img.preview.trim() || img.file.trim();

export const imageFullRaw = (img: ClassImage): string =>
  img.file.trim() || img.preview.trim();

export const formatEventMetaLine = (
  eventDate: string,
  schoolName: string,
  className: string,
): string => {
  const parts = [eventDate.trim(), schoolName.trim(), className.trim()].filter(Boolean);
  return parts.join(' • ') || '—';
};

export const imageStatsLabel = (img: ClassImage): string => {
  const comments = img.commentsCount ?? 0;
  const tagged = img.taggedCount ?? 0;
  if (comments > 0 || tagged > 0) {
    return `${comments}/${tagged}`;
  }
  return '0/0';
};

export const collectionTitleFromState = (
  collection: ClassCollection | undefined,
  fallback = '',
): string => collection ? collectionLabel(collection) : fallback;
