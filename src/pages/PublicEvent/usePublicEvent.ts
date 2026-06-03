import { useEffect, useState } from 'react';
import { getEvent } from '../Classes/classesApi';
import type { ClassCollection, ClassEvent, PublicEventData } from '../Classes/types';
import {
  findCollectionInEvent,
  findImageInCollection,
} from '../Classes/components/classViewUtils';
import type { ClassImage } from '../Classes/types';

export const resolvePublicCollectionId = (
  collection: ClassCollection,
  index: number,
): string => collection.id?.trim() || `idx-${index}`;

export const findPublicCollection = (
  event: ClassEvent | undefined,
  collectionIdParam: string,
): ClassCollection | undefined => {
  const key = collectionIdParam.trim();
  if (!key || !event) {
    return undefined;
  }
  if (key.startsWith('idx-')) {
    const index = Number(key.slice(4));
    if (Number.isFinite(index)) {
      return findCollectionInEvent(event, '', index);
    }
    return undefined;
  }
  return findCollectionInEvent(event, key, undefined);
};

export const findPublicImage = (
  collection: ClassCollection | undefined,
  imageIdParam: string,
): ClassImage | undefined => {
  const key = imageIdParam.trim();
  if (!key || !collection) {
    return undefined;
  }
  if (key.startsWith('idx-')) {
    const index = Number(key.slice(4));
    if (Number.isFinite(index)) {
      return findImageInCollection(collection, '', index);
    }
    return undefined;
  }
  return findImageInCollection(collection, key, undefined);
};

export const resolvePublicImageId = (image: ClassImage, index: number): string =>
  image.imageId?.trim() || `idx-${index}`;

export function usePublicEvent(eventId: string): {
  loading: boolean;
  error: string;
  data: PublicEventData | null;
  event: ClassEvent | undefined;
} {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicEventData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = eventId.trim();
    if (!id) {
      setLoading(false);
      setData(null);
      setError('Ссылка на событие некорректна');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    void getEvent({ eventId: id }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result) {
        setData(null);
        setError('Событие не найдено или недоступно');
      } else {
        setData(result);
        setError('');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return {
    loading,
    error,
    data,
    event: data?.event,
  };
}
