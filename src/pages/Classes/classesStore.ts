import { create } from 'zustand';
import { getClass } from './classesApi';
import type { ClassDetail, GetClassParams, OpenClassParams } from './types';
import {
  countMembersByRole,
  filterParents,
  filterStudents,
  upsertClassInList,
} from './utils';
import type { ClassMember } from './types';

export type {
  ClassCollection,
  ClassDetail,
  ClassEvent,
  ClassImage,
  ClassMember,
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
    patch: Partial<Pick<ClassMember, 'name' | 'phone' | 'authorized'>>,
  ) => void;
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

  reset:                  () =>
    set({
      classes: [],
      activeClassId: null,
      loading: false,
      error: null,
    }),
}));
