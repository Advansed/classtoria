import type { UserClass, UserSchool } from '../../Store';
import type {
  ClassCollection,
  ClassDetail,
  ClassEvent,
  ClassImage,
  ClassMember,
  ClassTeacher,
} from './types';

export const readStr = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : String(value ?? '').trim();

export const parseJsonArray = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const readNestedClasses = (school: Record<string, unknown>): unknown[] => {
  const direct = school.classes ?? school.Classes;
  if (direct != null) {
    return parseJsonArray(direct);
  }

  for (const [key, value] of Object.entries(school)) {
    if (key === 'id' || key === 'name' || key === 'region' || key === 'location') {
      continue;
    }
    const arr = parseJsonArray(value);
    if (arr.length > 0) {
      return arr;
    }
  }

  return [];
};

export const parseClassImage = (row: unknown): ClassImage | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  return {
    date: readStr(o.date),
    preview: readStr(o.preview ?? o.thumb ?? o.thumbnail),
    file: readStr(o.file ?? o.url ?? o.src),
  };
};

export const parseClassCollection = (row: unknown): ClassCollection | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const images = parseJsonArray(o.images)
    .map(parseClassImage)
    .filter((item): item is ClassImage => item !== null);

  return {
    date: readStr(o.date),
    name: readStr(o.name),
    title: readStr(o.title),
    images,
  };
};

export const parseClassEvent = (row: unknown): ClassEvent | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const collections = parseJsonArray(o.collections)
    .map(parseClassCollection)
    .filter((item): item is ClassCollection => item !== null);

  const title = readStr(o.title);
  if (!title) {
    return null;
  }

  return {
    title,
    date: readStr(o.date),
    collections,
  };
};

export const parseClassMember = (row: unknown): ClassMember | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id ?? o.user_id ?? o.userId;
  const name = o.name;
  if (id == null || id === '') {
    return null;
  }
  if (typeof name !== 'string' || !name.trim()) {
    return null;
  }

  const authorizedRaw = o.authorized ?? o.is_authorized ?? o.isAuthorized ?? o.logged_in;
  const authorized =
    authorizedRaw === true ||
    authorizedRaw === 1 ||
    authorizedRaw === '1' ||
    authorizedRaw === 'true';

  return {
    id: String(id),
    name: name.trim(),
    role: readStr(o.role),
    phone: readStr(o.phone ?? o.phone_number ?? o.phoneNumber),
    authorized,
  };
};

/** Формат телефона для отображения: +7 (914) 270-11-25 */
export const formatPhoneDisplay = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) {
    return '';
  }

  let normalized = digits;
  if (normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`;
  }
  if (!normalized.startsWith('7')) {
    normalized = `7${normalized.slice(0, 10)}`;
  }

  const part1 = normalized.slice(1, 4);
  const part2 = normalized.slice(4, 7);
  const part3 = normalized.slice(7, 9);
  const part4 = normalized.slice(9, 11);

  if (normalized.length <= 1) {
    return '+7';
  }
  if (normalized.length <= 4) {
    return `+7 (${part1}`;
  }
  if (normalized.length <= 7) {
    return `+7 (${part1}) ${part2}`;
  }
  if (normalized.length <= 9) {
    return `+7 (${part1}) ${part2}-${part3}`;
  }

  return `+7 (${part1}) ${part2}-${part3}-${part4}`;
};

export const filterParents = (members: ClassMember[]): ClassMember[] =>
  members.filter((m) => isParentRole(m.role));

export const filterStudents = (members: ClassMember[]): ClassMember[] =>
  members.filter((m) => isStudentRole(m.role));

const readNum = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const parseClassTeacher = (raw: unknown): ClassTeacher => {
  if (!raw || typeof raw !== 'object') {
    return { id: '', name: '', image: '', achievements: 0, gratitudes: 0 };
  }
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o.user_id ?? o.userId;
  const name = o.name;
  return {
    id: id != null && id !== '' ? String(id) : '',
    name: typeof name === 'string' ? name.trim() : '',
    image: readStr(o.image ?? o.avatar ?? o.photo),
    achievements: readNum(o.achievements ?? o.achievements_count ?? o.achievement_count),
    gratitudes: readNum(o.gratitudes ?? o.gratitude_count ?? o.thanks ?? o.thanks_count),
  };
};

export const isStudentRole = (role: string): boolean =>
  /ученик|student|pupil|школьник/i.test(role);

export const isParentRole = (role: string): boolean =>
  /родител|parent/i.test(role);

export const countMembersByRole = (members: ClassMember[]): {
  studentCount: number;
  parentCount: number;
} => ({
  studentCount: members.filter((m) => isStudentRole(m.role)).length,
  parentCount: members.filter((m) => isParentRole(m.role)).length,
});

export const parseClassDetail = (
  payload: unknown,
  fallback: { id: string; name?: string },
): ClassDetail | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const id = o.id ?? o.class_id ?? o.classId ?? fallback.id;
  const name = readStr(o.name ?? o.class_name ?? o.className ?? fallback.name);

  if (id == null || id === '') {
    return null;
  }

  const members = parseJsonArray(o.members)
    .map(parseClassMember)
    .filter((item): item is ClassMember => item !== null);

  const events = parseJsonArray(o.events)
    .map(parseClassEvent)
    .filter((item): item is ClassEvent => item !== null);

  return {
    id: String(id),
    name: name || fallback.name || '',
    teacher: parseClassTeacher(o.teacher ?? o.class_teacher ?? o.classTeacher),
    members,
    events,
  };
};

export const parseSchoolClassRow = (row: unknown): Pick<UserClass, 'id' | 'name'> | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id ?? o.class_id ?? o.classId;
  const name = o.name ?? o.class_name ?? o.className;

  if (id == null || id === '') {
    return null;
  }
  if (typeof name !== 'string' || !name.trim()) {
    return null;
  }

  return {
    id: String(id),
    name: name.trim(),
  };
};

export const parseSchoolRow = (row: unknown): UserSchool | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id ?? o.school_id ?? o.schoolId;
  const name = o.name ?? o.school_name ?? o.schoolName;

  if (id == null || id === '') {
    return null;
  }
  if (typeof name !== 'string' || !name.trim()) {
    return null;
  }

  const region = typeof o.region === 'string' ? o.region : String(o.region ?? '');
  const location = typeof o.location === 'string' ? o.location : String(o.location ?? '');

  const classes = readNestedClasses(o)
    .map(parseSchoolClassRow)
    .filter((item): item is Pick<UserClass, 'id' | 'name'> => item !== null);

  return {
    id: String(id),
    name: name.trim(),
    region,
    location,
    classes,
  };
};

export const parseSchoolsList = (payload: unknown): UserSchool[] => {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { schools?: unknown }).schools)
      ? (payload as { schools: unknown[] }).schools
      : [];

  return rows
    .map(parseSchoolRow)
    .filter((item): item is UserSchool => item !== null);
};

/** Плоский список классов с привязкой к школе. */
export const flattenSchoolClasses = (schools: UserSchool[]): UserClass[] =>
  schools.flatMap((school) =>
    school.classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      role: '',
      schoolId: school.id,
      schoolName: school.name,
      region: school.region,
      location: school.location,
    })),
  );

export const upsertClassInList = (list: ClassDetail[], detail: ClassDetail): ClassDetail[] => {
  const idx = list.findIndex((c) => c.id === detail.id);
  if (idx < 0) {
    return [...list, detail];
  }
  const next = [...list];
  next[idx] = detail;
  return next;
};
