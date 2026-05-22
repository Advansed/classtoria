import type { ClassCollection } from '../types';

export const collectionSelectValue = (index: number): string => `existing:${index}`;

export const parseCollectionSelectValue = (
  key: string,
  collectionsLength: number,
): number | null => {
  if (!key.startsWith('existing:')) {
    return null;
  }
  const index = Number.parseInt(key.slice('existing:'.length), 10);
  if (!Number.isFinite(index) || index < 0 || index >= collectionsLength) {
    return null;
  }
  return index;
};

export const collectionLabel = (col: ClassCollection): string =>
  col.title.trim() || col.name.trim() || 'Коллекция';
