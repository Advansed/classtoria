import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api';
import { useToast } from '../../../hooks/useToast';
import { useStore, type Profile } from '../../../Store';

const DEFAULT_IMAGE = '/images/auth-feature.png';

export type UseProfileResult = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useProfile(): UseProfileResult {
  const token = useStore((s) => s.token);
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setError('Нет токена авторизации');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api<Profile>('profile', { token });

      if (res.success && res.data) {
        const data = res.data;
        setProfile({
          phone: data.phone ?? '',
          name: data.name ?? '',
          email: data.email ?? '',
          role: data.role ?? '',
          image: data.image?.trim() ? data.image.trim() : DEFAULT_IMAGE,
        });
        return;
      }

      const message = res.message?.trim() || 'Не удалось загрузить профиль';
      setError(message);
      toast.error(message);
    } catch {
      const message = 'Ошибка сети при загрузке профиля';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, setProfile, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { profile, loading, error, reload };
}
