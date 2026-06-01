import type { ClassEvent } from './types';
import { parseClassEvent } from './utils';

export const parseFavoritesList = (raw: unknown): ClassEvent[] => {
  if (!raw) {
    return [];
  }
  const rows = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as { favorites?: unknown }).favorites)
      ? (raw as { favorites: unknown[] }).favorites
      : [];
  return rows
    .map(parseClassEvent)
    .filter((item): item is ClassEvent => item !== null);
};

/** Извлечь избранное из ответа API (login, add_favorite, …). */
export const parseFavoritesFromApi = (res: {
  favorites?: unknown;
  favorite?: unknown;
  data?: unknown;
}): ClassEvent[] => {
  if (res.favorites != null) {
    return parseFavoritesList(res.favorites);
  }
  if (res.favorite != null) {
    const one = parseClassEvent(res.favorite);
    return one ? [one] : [];
  }
  if (Array.isArray(res.data)) {
    return parseFavoritesList(res.data);
  }
  if (res.data && typeof res.data === 'object') {
    const data = res.data as { favorites?: unknown; favorite?: unknown };
    if (data.favorites != null) {
      return parseFavoritesList(data.favorites);
    }
    if (data.favorite != null) {
      const one = parseClassEvent(data.favorite);
      return one ? [one] : [];
    }
  }
  return [];
};

/** Есть ли фото с данным image_id в списке избранного. */
export const imageIsInFavorites = (favorites: ClassEvent[], imageId: string): boolean => {
  const id = imageId.trim();
  if (!id) {
    return false;
  }
  for (const event of favorites) {
    for (const collection of event.collections) {
      if (collection.images.some((img) => img.imageId === id)) {
        return true;
      }
    }
  }
  return false;
};

export const favoriteEventPhotos = (event: ClassEvent): number =>
  event.collections.reduce((sum, col) => sum + col.images.length, 0);

export const favoriteEventThumbRaw = (event: ClassEvent): string => {
  for (const collection of event.collections) {
    const img = collection.images[0];
    if (!img) {
      continue;
    }
    const url = img.preview.trim() || img.file.trim();
    if (url) {
      return url;
    }
  }
  return '';
};

export const summarizeFavorites = (
  favorites: ClassEvent[],
): { events: number; photos: number; videos: number } => ({
  events: favorites.length,
  photos: favorites.reduce((sum, event) => sum + favoriteEventPhotos(event), 0),
  videos: favorites.reduce((sum, event) => sum + (event.videoCount ?? 0), 0),
});
