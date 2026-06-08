import { useEffect, useState } from 'react';
import { resolveImagePublicUrl } from './collectionUploadStorage';

const FALLBACK = '/images/start-gallery.png';

const isDirectMediaUrl = (value: string): boolean => {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:');
};

/** URL для превью: `public_url`, ключ в хранилище или подписанный GET. */
export const useClassImageSrc = (
  token: string | null | undefined,
  raw: string | undefined,
): string => {
  const [src, setSrc] = useState(FALLBACK);

  useEffect(() => {
    const key = raw?.trim() ?? '';
    if (!key) {
      setSrc(FALLBACK);
      return;
    }
    if (isDirectMediaUrl(key)) {
      setSrc(key);
      return;
    }

    const trimmedToken = token?.trim() ?? '';
    if (!trimmedToken) {
      setSrc(FALLBACK);
      return;
    }

    let cancelled = false;
    void resolveImagePublicUrl(trimmedToken, key, key).then((url) => {
      if (!cancelled) {
        setSrc(url.trim() || FALLBACK);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, raw]);

  return src;
};
