import { create } from 'zustand';
import {
  addCollection as addCollectionApi,
  deleteMember as deleteMemberApi,
  addEvent as addEventApi,
  addMember as addMemberApi,
  setMember as setMemberApi,
  getClass,
} from './classesApi';
import type { ClassDetail, GetClassParams, OpenClassParams } from './types';
import {
  countMembersByRole,
  filterParents,
  filterStudents,
  upsertClassInList,
} from './utils';

export { isClassAdminRole } from './utils';
import type { ClassMember } from './types';

export type {
  ClassCollection,
  ClassDetail,
  ClassEvent,
  ClassImage,
  ClassMember,
  ClassStats,
  ClassTeacher,
  GetClassParams,
  OpenClassParams,
} from './types';

type ClassesState = {
  classes:                ClassDetail[];
  activeClassId:          string | null;
  loading:                boolean;
  error:                  string | null;
  loadClass:              (params: GetClassParams) => Promise<ClassDetail | null>;
  openClass:              (params: OpenClassParams) => Promise<ClassDetail | null>;
  upsertClass:            (detail: ClassDetail) => void;
  getClassById:           (classId: string) => ClassDetail | undefined;
  getMemberCounts:        (classId: string) => { studentCount: number; parentCount: number };
  getParents:             (classId: string) => ClassMember[];
  getStudents:            (classId: string) => ClassMember[];
  updateMember:           (
    classId: string,
    memberId: string,
    patch: Partial<Pick<ClassMember, 'name' | 'phone' | 'authorized' | 'checked'>>,
  ) => void;
  confirmMember:          (params: {
    token: string;
    classId: string;
    userId: string;
    schoolId?: string;
    name?: string;
  }) => Promise<{ success: boolean; message: string | null }>;
  deleteMember:           (params: {
    token: string;
    classId: string;
    userId: string;
    schoolId?: string;
    name?: string;
  }) => Promise<{ success: boolean; message: string | null }>;
  addMember:              (params: {
    token: string;
    classId: string;
    phone: string;
    role: string;
    schoolId?: string;
    name?: string;
  }) => Promise<{ success: boolean; message: string | null }>;
  addEvent:               (params: {
    token: string;
    classId: string;
    name: string;
    date: string;
    description?: string;
    schoolId?: string;
    className?: string;
  }) => Promise<{ success: boolean; message: string | null }>;
  addCollection:          (params: {
    token: string;
    classId: string;
    eventId: string;
    name: string;
    schoolId?: string;
    className?: string;
  }) => Promise<{ success: boolean; message: string | null }>;
  reset:                  () => void;
};

export const useClassesStore = create<ClassesState>((set, get) => ({
  classes:                [],
  activeClassId:          null,
  loading:                false,
  error:                  null,

  getClassById:           (classId) => get().classes.find((c) => c.id === classId),

  getMemberCounts:        (classId) => {
    const detail = get().classes.find((c) => c.id === classId);
    return countMembersByRole(detail?.members ?? []);
  },

  getParents:             (classId) => {
    const detail = get().classes.find((c) => c.id === classId);
    return filterParents(detail?.members ?? []);
  },

  getStudents:            (classId) => {
    const detail = get().classes.find((c) => c.id === classId);
    return filterStudents(detail?.members ?? []);
  },

  updateMember:           (classId, memberId, patch) =>
    set((s) => ({
      classes: s.classes.map((cls) => {
        if (cls.id !== classId) {
          return cls;
        }
        return {
          ...cls,
          members: cls.members.map((member) =>
            member.id === memberId ? { ...member, ...patch } : member,
          ),
        };
      }),
    })),

  confirmMember:          async ({ token, classId, userId, schoolId, name }) => {
    const res = await setMemberApi({ token, classId, id: userId });
    if (!res.success) {
      return {
        success: false,
        message: res.message ?? 'Не удалось подтвердить участника',
      };
    }

    await get().loadClass({ token, classId, schoolId, name });
    return {
      success: true,
      message: res.message ?? 'Участник подтверждён',
    };
  },

  deleteMember:           async ({ token, classId, userId, schoolId, name }) => {
    const res = await deleteMemberApi({ token, classId, id: userId });
    if (!res.success) {
      return {
        success: false,
        message: res.message ?? 'Не удалось удалить участника',
      };
    }

    await get().loadClass({ token, classId, schoolId, name });
    return {
      success: true,
      message: res.message ?? 'Участник удалён',
    };
  },

  upsertClass:            (detail) =>
    set((s) => ({
      classes: upsertClassInList(s.classes, detail),
      activeClassId: detail.id,
    })),

  loadClass:              async ({ classId, token, schoolId, name }) => {
    const id = classId.trim();
    const trimmedToken = token.trim();
    if (!id || !trimmedToken) {
      set({ error: 'Нет идентификатора класса или токена', loading: false });
      return null;
    }

    set({ loading: true, error: null, activeClassId: id });

    try {
      const detail = await getClass({ token: trimmedToken, classId: id, schoolId, name });
      if (!detail) {
        set({ loading: false, error: 'Не удалось загрузить класс' });
        return null;
      }

      set((s) => ({
        classes: upsertClassInList(s.classes, detail),
        loading: false,
        error: null,
        activeClassId: id,
      }));

      return detail;
    } catch {
      set({ loading: false, error: 'Ошибка сети при загрузке класса' });
      return null;
    }
  },

  openClass:              async (params) => get().loadClass(params),

  addMember:              async ({ token, classId, phone, role, schoolId, name }) => {
    const res = await addMemberApi({ token, classId, phone, role });
    if (!res.success) {
      return {
        success: false,
        message: res.message ?? 'Не удалось добавить участника',
      };
    }

    await get().loadClass({ token, classId, schoolId, name });
    return {
      success: true,
      message: res.message ?? 'Участник добавлен',
    };
  },

  addEvent:               async ({ token, classId, name, date, description, schoolId, className }) => {
    const res = await addEventApi({ token, classId, name, date, description });
    if (!res.success) {
      return {
        success: false,
        message: res.message ?? 'Не удалось создать событие',
      };
    }

    await get().loadClass({ token, classId, schoolId, name: className });
    return {
      success: true,
      message: res.message ?? 'Событие создано',
    };
  },

  addCollection:          async ({ token, classId, eventId, name, schoolId, className }) => {
    const res = await addCollectionApi({ token, eventId, name });
    if (!res.success) {
      return {
        success: false,
        message: res.message ?? 'Не удалось создать коллекцию',
      };
    }

    await get().loadClass({ token, classId, schoolId, name: className });
    return {
      success: true,
      message: res.message ?? 'Коллекция создана',
    };
  },

  reset:                  () =>
    set({
      classes: [],
      activeClassId: null,
      loading: false,
      error: null,
    }),
}));
