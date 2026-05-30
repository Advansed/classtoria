import { useCallback, useEffect, useState } from 'react';
import { resolveAvatarSrc } from '../pages/PersonalPage/components/avatarUpload';
import { DEFAULT_PROFILE_IMAGE, useStore } from '../Store';

/** Подписанный URL аватара ребёнка по ключу `image` из Childrens. */
export function useChildAvatarUrl(imageKey: string | undefined): string {
  const token = useStore((s) => s.token);
  const [displayUrl, setDisplayUrl] = useState(DEFAULT_PROFILE_IMAGE);

  const refresh = useCallback(async () => {
    try {
      const src = await resolveAvatarSrc(token, imageKey);
      setDisplayUrl(src);
    } catch {
      setDisplayUrl(DEFAULT_PROFILE_IMAGE);
    }
  }, [token, imageKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return displayUrl;
}
