import { useCallback, useEffect, useState } from 'react';
import { resolveAvatarSrc } from '../pages/PersonalPage/components/avatarUpload';
import { DEFAULT_PROFILE_IMAGE, useStore } from '../Store';

/**
 * Подписанный URL для показа аватара по ключу из profile.image (`user_id/avatar.jpg`).
 * Вызывает api('get_signedurl', { token, filename }).
 */
export function useAvatarDisplayUrl(): string {
  const token = useStore((s) => s.token);
  const imageKey = useStore((s) => s.profile?.image);
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
