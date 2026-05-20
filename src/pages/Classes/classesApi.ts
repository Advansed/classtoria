import { api, type ApiResponse } from '../../api';
import type { UserClass, UserSchool } from '../../Store';
import type { ClassDetail, GetClassParams } from './types';
import {
  flattenSchoolClasses,
  parseClassDetail,
  parseSchoolsList,
} from './utils';

/** Ответ `post('get_classes', { token })`. */
export async function getClasses(token: string): Promise<{
  schools: UserSchool[];
  classes: UserClass[];
}> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { schools: [], classes: [] };
  }

  const res: ApiResponse<unknown> = await api('get_classes', { token: trimmed });

  if (!res.success) {
    return { schools: [], classes: [] };
  }

  let schools: UserSchool[] = [];

  if (res.data != null) {
    schools = parseSchoolsList(res.data);
  } else {
    const withSchools = res as ApiResponse<unknown> & { schools?: unknown };
    if (Array.isArray(withSchools.schools)) {
      schools = parseSchoolsList(withSchools.schools);
    }
  }

  return {
    schools,
    classes: flattenSchoolClasses(schools),
  };
}

/** Ответ `post('get_class', { token, class_id, school_id? })`. */
export async function getClass(params: GetClassParams): Promise<ClassDetail | null> {
  const trimmedToken = params.token.trim();
  const id = params.classId.trim();
  if (!trimmedToken || !id) {
    return null;
  }

  const body: { token: string; class_id: string; school_id?: string } = {
    token: trimmedToken,
    class_id: id,
  };
  const school = params.schoolId?.trim();
  if (school) {
    body.school_id = school;
  }

  const res: ApiResponse<unknown> = await api('get_class', body);
  if (!res.success) {
    return null;
  }

  const fallback = { id, name: params.name };
  if (res.data != null) {
    return parseClassDetail(res.data, fallback);
  }

  return parseClassDetail(res, fallback);
}

/** @deprecated Используйте {@link getClasses}. */
export const fetchUserClasses = getClasses;

/** @deprecated Используйте {@link getClass}. */
export async function fetchClassDetail(
  token: string,
  classId: string,
  schoolId?: string,
  fallbackName?: string,
): Promise<ClassDetail | null> {
  return getClass({ token, classId, schoolId, name: fallbackName });
}
