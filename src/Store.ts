import { create } from 'zustand';

export type Profile = {
  phone: string;
  name: string;
  email: string;
  role: string;
  /** URL или путь к аватару */
  image: string;
};

type AppState = {
  /** Признак успешной авторизации в приложении */
  auth: boolean;
  /** Токен сессии (JWT или строка с бэкенда) */
  token: string | null;
  profile: Profile | null;
  setAuth: (value: boolean) => void;
  setToken: (value: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  reset: () => void;
};

const initialProfile: Profile = {
  phone: '',
  name: '',
  email: '',
  role: '',
  image: '',
};

export const useStore = create<AppState>((set) => ({
  auth: false,
  token: null,
  profile: null,

  setAuth: (value) => set({ auth: value }),

  setToken: (value) => set({ token: value }),

  setProfile: (profile) => set({ profile }),

  updateProfile: (patch) =>
    set((s) => ({
      profile: { ...(s.profile ?? initialProfile), ...patch },
    })),

  reset: () => set({ auth: false, token: null, profile: null }),
}));
