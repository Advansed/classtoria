import { useIonToast } from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAvatarDisplayUrl } from '../../../hooks/useAvatarDisplayUrl';
import { api } from '../../../api';
import { useStore, type Profile } from '../../../Store';
import { normalizeStoredImageKey, uploadAvatarFile } from './avatarUpload';

type ProfileApiData = Profile & { user_id?: string | number };

const readUserId = (data: ProfileApiData | null | undefined): string => {
  if (!data?.user_id) {
    return '';
  }
  return String(data.user_id).trim();
};

export type UseProfileResult = {
  profile: Profile | null;
  avatarDisplayUrl: string;
  loading: boolean;
  saving: boolean;
  uploadingAvatar: boolean;
  error: string | null;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  isDirty: boolean;
  reload: () => Promise<void>;
  save: () => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
};

export function useProfile(): UseProfileResult {
  const token = useStore((s) => s.token);
  const userId = useStore((s) => s.user_id);
  const profile = useStore((s) => s.profile);
  const avatarDisplayUrl = useAvatarDisplayUrl();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [present] = useIonToast();
  const presentRef = useRef(present);
  presentRef.current = present;

  const applyProfileData = useCallback((data: ProfileApiData) => {
    const id = readUserId(data);
    if (id) {
      useStore.getState().setUserId(id);
    }
    const imageKey = normalizeStoredImageKey(data.image ?? '');
    useStore.getState().setProfile({
      phone: data.phone ?? '',
      name: data.name ?? '',
      email: data.email ?? '',
      role: data.role ?? '',
      image: imageKey,
    });
    setName(data.name ?? '');
    setEmail(data.email ?? '');
  }, []);

  const showToast = useCallback((message: string, color: 'success' | 'danger') => {
    void presentRef.current({
      message,
      duration: 2200,
      position: 'top',
      color,
    });
  }, []);

  const reload = useCallback(async () => {
    if (!token) {
      setError('Нет токена авторизации');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api<ProfileApiData>('profile', { token });

      if (res.success && res.data) {
        applyProfileData(res.data);
        return;
      }

      const message = res.message?.trim() || 'Не удалось загрузить профиль';
      setError(message);
      showToast(message, 'danger');
    } catch {
      const message = 'Ошибка сети при загрузке профиля';
      setError(message);
      showToast(message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [token, applyProfileData, showToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isDirty =
    profile !== null &&
    (name.trim() !== (profile.name ?? '').trim() || email.trim() !== (profile.email ?? '').trim());

  const save = useCallback(async (): Promise<boolean> => {
    if (!token || !profile) {
      showToast('Нет токена авторизации', 'danger');
      return false;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const savedName = (profile.name ?? '').trim();
    const savedEmail = (profile.email ?? '').trim();

    if (!trimmedName) {
      showToast('Укажите ФИО', 'danger');
      return false;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Некорректный email', 'danger');
      return false;
    }

    const body: { token: string; name?: string; email?: string } = { token };
    if (trimmedName !== savedName) {
      body.name = trimmedName;
    }
    if (trimmedEmail !== savedEmail) {
      body.email = trimmedEmail;
    }

    if (body.name === undefined && body.email === undefined) {
      return true;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await api<Pick<Profile, 'name' | 'email'>>('set_profile', body);

      if (res.success) {
        const nextName = res.data?.name ?? trimmedName;
        const nextEmail = res.data?.email ?? trimmedEmail;
        useStore.getState().updateProfile({ name: nextName, email: nextEmail });
        setName(nextName);
        setEmail(nextEmail);
        showToast('Профиль сохранён', 'success');
        return true;
      }

      const message = res.message?.trim() || 'Не удалось сохранить профиль';
      setError(message);
      showToast(message, 'danger');
      return false;
    } catch {
      const message = 'Ошибка сети при сохранении';
      setError(message);
      showToast(message, 'danger');
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, profile, name, email, showToast]);

  const uploadAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      if (!token) {
        showToast('Нет токена авторизации', 'danger');
        return false;
      }

      const id = userId.trim();
      if (!id) {
        showToast('Не удалось определить пользователя', 'danger');
        return false;
      }

      if (!file.type.startsWith('image/')) {
        showToast('Выберите изображение', 'danger');
        return false;
      }

      setUploadingAvatar(true);
      setError(null);

      try {
        const { filename } = await uploadAvatarFile(token, id, file);

        try {
          const saveRes = await api<Pick<Profile, 'image'>>('set_profile', {
            token,
            image: filename,
          });
          const savedKey = normalizeStoredImageKey(saveRes.data?.image ?? filename);
          useStore.getState().updateProfile({ image: savedKey });
        } catch {
          useStore.getState().updateProfile({ image: filename });
        }

        showToast('Аватар обновлён', 'success');
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Не удалось загрузить аватар';
        setError(message);
        showToast(message, 'danger');
        return false;
      } finally {
        setUploadingAvatar(false);
      }
    },
    [token, userId, showToast],
  );

  return {
    profile,
    avatarDisplayUrl,
    loading,
    saving,
    uploadingAvatar,
    error,
    name,
    setName,
    email,
    setEmail,
    isDirty,
    reload,
    save,
    uploadAvatar,
  };
}
