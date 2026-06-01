import { create } from 'zustand';
import { getClasses } from './pages/Classes/classesApi';
import type { ClassEvent } from './pages/Classes/types';
import { parseFavoritesFromApi } from './pages/Classes/favoritesUtils';
import type { ChildRecord } from './pages/PersonalPage/childrenTypes';
import { parseChildrenFromApi, upsertChild } from './pages/PersonalPage/childrenUtils';
import {
  DEFAULT_PROFILE_IMAGE,
  normalizeStoredImageKey,
} from './pages/PersonalPage/components/avatarUpload';

export { DEFAULT_PROFILE_IMAGE };

/** Данные пользователя из ответа login (поле `user`). */
export type AuthUser = {
  name:                   string;
  phone:                  string;
  email:                  string;
  image:                  string;
  role?:                  string;
};

export type Profile = {
  phone:                  string;
  name:                   string;
  email:                  string;
  role:                   string;
  /** Ключ файла в хранилище, например `user_id/avatar.jpg` (не полный URL). */
  image:                  string;
};

/** Класс внутри школы (`Class`: id, name, role). */
export type SchoolClass = {
  id:                     string;
  name:                   string;
  role:                   string;
};

/** Школа из `get_classes` (`School` + вложенные классы). */
export type UserSchool = {
  id:                     string;
  name:                   string;
  region:                 string;
  location:               string;
  classes:                SchoolClass[];
};

/** Плоский класс с контекстом школы (для списков в UI). */
export type UserClass = {
  id:                     string;
  name:                   string;
  role:                   string;
  schoolId:               string;
  schoolName:             string;
  region:                 string;
  location:               string;
};

export type LoginSession = {
  token:                  string;
  user_id:                string | number;
  user:                   Partial<AuthUser>;
};

type AppState = {
  auth:                   boolean;
  user_id:                string;
  token:                  string | null;
  profile:                Profile | null;
  schools:                UserSchool[];
  classes:                UserClass[];
  childrens:              ChildRecord[];
  /** Избранные события (та же структура, что ClassEvent), приходит с login. */
  favorites:              ClassEvent[];
  setAuth:                (value: boolean) => void;
  setUserId:              (value: string) => void;
  setToken:               (value: string | null) => void;
  setProfile:             (profile: Profile | null) => void;
  updateProfile:          (patch: Partial<Profile>) => void;
  setSchools:             (schools: UserSchool[]) => void;
  setClasses:             (classes: UserClass[]) => void;
  setChildren:            (childrens: ChildRecord[]) => void;
  setFavorites:           (favorites: ClassEvent[]) => void;
  /** Обновить список из поля `childrens` в ответе API (login, add_child, …). */
  applyChildrenFromApi:   (res: { childrens?: unknown; children?: unknown; data?: unknown }) => void;
  /** Обновить избранное из поля `favorites` в ответе API (login, add_favorite, …). */
  applyFavoritesFromApi:  (res: { favorites?: unknown; favorite?: unknown; data?: unknown }) => void;
  /** После add_child: childrens из ответа или локальное добавление записи. */
  applyChildAdded:        (
    res: { childrens?: unknown; children?: unknown; data?: unknown },
    child: ChildRecord,
  ) => void;
  loadClasses:            () => Promise<void>;
  applyLogin:             (
    session: LoginSession,
    childrens?: ChildRecord[],
    favorites?: ClassEvent[],
  ) => void;
  reset:                  () => void;
};

const initialProfile: Profile = {
  phone:                  '',
  name:                   '',
  email:                  '',
  role:                   '',
  image:                  '',
};

const userToProfile = (user: Partial<AuthUser>): Profile => ({
  phone:                  user.phone ?? '',
  name:                   user.name ?? '',
  email:                  user.email ?? '',
  role:                   user.role ?? '',
  image:                  normalizeStoredImageKey(user.image ?? ''),
});

export const useStore = create<AppState>((set, get) => ({
  auth:                   false,
  user_id:                '',
  token:                  null,
  profile:                null,
  schools:                [],
  classes:                [],
  childrens:              [],
  favorites:              [],

  setAuth:                (value) => set({ auth: value }),

  setUserId:              (value) => set({ user_id: value }),

  setToken:               (value) => set({ token: value }),

  setProfile:             (profile) => set({ profile }),

  updateProfile:          (patch) =>
    set((s) => ({
      profile: { ...(s.profile ?? initialProfile), ...patch },
    })),

  setSchools:             (schools) => set({ schools }),

  setClasses:             (classes) => set({ classes }),

  setChildren:            (childrens) => set({ childrens }),

  applyChildrenFromApi:   (res) => {
    set({ childrens: parseChildrenFromApi(res) });
  },

  applyChildAdded:        (res, child) => {
    const parsed = parseChildrenFromApi(res);
    if (parsed.length > 0) {
      set({ childrens: parsed });
      return;
    }
    set((s) => ({ childrens: upsertChild(s.childrens, child) }));
  },

  setFavorites:           (favorites) => set({ favorites }),

  applyFavoritesFromApi:  (res) => {
    set({ favorites: parseFavoritesFromApi(res) });
  },

  loadClasses:            async () => {
    const token = get().token;
    if (!token?.trim()) {
      set({ schools: [], classes: [] });
      return;
    }
    try {
      const { schools, classes } = await getClasses(token);
      set({ schools, classes });
    } catch {
      set({ schools: [], classes: [] });
    }
  },

  applyLogin:             ({ token, user_id, user }, childrens = [], favorites = []) => {
    const trimmedToken = token.trim();
    set({
      auth: true,
      token: trimmedToken,
      user_id: String(user_id).trim(),
      profile: userToProfile(user),
      schools: [],
      classes: [],
      childrens,
      favorites,
    });
    void get().loadClasses();
  },

  reset:                  () =>
    set({
      auth: false,
      user_id: '',
      token: null,
      profile: null,
      schools: [],
      classes: [],
      childrens: [],
      favorites: [],
    }),
}));
