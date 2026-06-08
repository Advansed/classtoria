import type { SchoolClass, UserClass, UserSchool } from '../../Store';
import { normalizeEventDate } from './components/eventFormUtils';
import type {
  ClassCollection,
  ClassDetail,
  ClassEvent,
  ClassImage,
  ClassMember,
  ClassStats,
  ClassTeacher,
  EventComment,
  PublicEventData,
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
  const idRaw = o.image_id ?? o.imageId ?? o.id;
  const imageId = idRaw != null ? String(idRaw).trim() : '';

  const featuredRaw = o.featured ?? o.is_featured ?? o.isFeatured ?? o.crown;
  const featured =
    featuredRaw === true ||
    featuredRaw === 1 ||
    featuredRaw === '1' ||
    featuredRaw === 'true';

  const commentsCount = readNum(
    o.comments ?? o.comments_count ?? o.comment_count ?? o.commentsCount,
  );
  const taggedCount = readNum(
    o.tagged ?? o.tagged_count ?? o.tags_count ?? o.taggedCount ?? o.tags,
  );

  const typeRaw = readStr(o.type ?? o.media_type ?? o.mediaType).toLowerCase();
  const isVideoFlag =
    typeRaw === 'video' ||
    o.is_video === true ||
    o.is_video === 1 ||
    o.isVideo === true ||
    o.isVideo === 1;

  const file = readStr(o.fileurl ?? o.file_url ?? o.file ?? o.url ?? o.src);
  const isVideoFromPath = /\/video\.[a-z0-9]{2,5}$/i.test(file);
  const isVideo = isVideoFlag || isVideoFromPath;

  const duration = readStr(o.duration ?? o.video_duration ?? o.videoDuration);

  return {
    date: readStr(o.date),
    preview: readStr(
      o.previewurl ?? o.preview_url ?? o.preview ?? o.thumb ?? o.thumbnail,
    ),
    file,
    ...(imageId ? { imageId } : {}),
    ...(featured ? { featured: true } : {}),
    ...(commentsCount > 0 ? { commentsCount } : {}),
    ...(taggedCount > 0 ? { taggedCount } : {}),
    ...(isVideo ? { isVideo: true } : {}),
    ...(duration ? { duration } : {}),
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

  const idRaw = o.id ?? o.collection_id ?? o.collectionId;
  const id = idRaw != null ? String(idRaw).trim() : '';
  const creatorId = parseEventCreatorId(o);
  const creatorName =
    readStr(o.creator_name ?? o.creatorName ?? o.author ?? o.author_name ?? o.authorName);

  const videoUrl = readStr(o.video_url ?? o.videoUrl ?? o.video);
  const videoPreview = readStr(
    o.video_preview ?? o.videoPreview ?? o.video_thumb ?? o.videoThumb,
  );
  const videoDuration = readStr(o.video_duration ?? o.videoDuration ?? o.duration);
  const videoImageId = readStr(
    o.video_image_id ?? o.videoImageId ?? o.video_id ?? o.videoId,
  );

  return {
    ...(id ? { id } : {}),
    date: readStr(o.date),
    name: readStr(o.name),
    title: readStr(o.title),
    ...(creatorId ? { creatorId } : {}),
    ...(creatorName ? { creatorName } : {}),
    images,
    ...(videoUrl ? { videoUrl } : {}),
    ...(videoPreview ? { videoPreview } : {}),
    ...(videoDuration ? { videoDuration } : {}),
    ...(videoImageId ? { videoImageId } : {}),
  };
};

export const parseEventComment = (row: unknown): EventComment | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const idRaw = o.id ?? o.comment_id ?? o.commentId;
  const text = readStr(o.text ?? o.message ?? o.body ?? o.content);
  const authorName = readStr(o.author_name ?? o.authorName ?? o.name ?? o.user_name);
  if (!text || !authorName) {
    return null;
  }
  return {
    id: idRaw != null && idRaw !== '' ? String(idRaw) : `${authorName}-${text.slice(0, 24)}`,
    authorName,
    authorRole: readStr(o.author_role ?? o.authorRole ?? o.role),
    text,
    avatar: readStr(o.avatar ?? o.image ?? o.photo) || undefined,
  };
};

const unwrapEventRow = (row: unknown): Record<string, unknown> | null => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }
  const o = row as Record<string, unknown>;
  const nested = o.event ?? o.Event ?? o.item ?? o.data;
  if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return o;
};

const creatorIdFromCollections = (collections: ClassCollection[]): string => {
  for (const col of collections) {
    const id = col.creatorId?.trim();
    if (id) {
      return id;
    }
  }
  return '';
};

const readCreatorScalar = (o: Record<string, unknown>): string => {
  const creator = o.creator;
  if (creator == null || typeof creator === 'object') {
    return '';
  }
  return readIdValue(creator);
};

const parseEventsList = (raw: unknown): ClassEvent[] => {
  const fromArray = parseJsonArray(raw)
    .map(parseClassEvent)
    .filter((item): item is ClassEvent => item !== null);
  if (fromArray.length > 0) {
    return fromArray;
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }

  return Object.values(raw as Record<string, unknown>)
    .map(parseClassEvent)
    .filter((item): item is ClassEvent => item !== null);
};

export const parseClassEvent = (row: unknown): ClassEvent | null => {
  const o = unwrapEventRow(row);
  if (!o) {
    return null;
  }

  const collections = parseJsonArray(o.collections)
    .map(parseClassCollection)
    .filter((item): item is ClassCollection => item !== null);

  const comments = parseJsonArray(o.comments)
    .map(parseEventComment)
    .filter((item): item is EventComment => item !== null);

  const title = readStr(o.title) || readStr(o.name);
  if (!title) {
    return null;
  }

  const idRaw = o.id ?? o.event_id ?? o.eventId;
  const id = idRaw != null ? String(idRaw).trim() : '';
  const creatorId =
    parseEventCreatorId(o) || readCreatorScalar(o) || creatorIdFromCollections(collections);

  const dateRaw =
    o.period ?? o.date ?? o.event_date ?? o.eventDate ?? o.datetime ?? o.created_at ?? o.createdAt;
  const date = normalizeEventDate(dateRaw);
  const description =
    readStr(o.description) || readStr(o.desc) || readStr(o.about) || readStr(o.text);

  const videoCount = readNum(o.video_count ?? o.videoCount ?? o.videos ?? o.video);

  return {
    ...(id ? { id } : {}),
    // Гарантируем, что creator и creatorId всегда присутствуют
    creator: creatorId || '',
    creatorId: creatorId || '',
    title,
    date,
    ...(description ? { description } : {}),
    collections,
    ...(comments.length > 0 ? { comments } : {}),
    ...(videoCount > 0 ? { videoCount } : {}),
  };
};

const looksLikePhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10;
};

/** Участник белого списка: есть id, роль и номер телефона (имя может быть пустым). */
export const isWhitelistMember = (role: string, phone: string): boolean =>
  Boolean(role.trim()) && looksLikePhone(phone);

export const parseClassMember = (row: unknown): ClassMember | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = o.id ?? o.user_id ?? o.userId;
  if (id == null || id === '') {
    return null;
  }

  const role = readStr(o.role);
  let phone = readStr(o.phone ?? o.phone_number ?? o.phoneNumber);
  let name = readPersonName(o);
  if (!phone && looksLikePhone(name)) {
    phone = name;
    name = '';
  }
  if (looksLikePhone(name)) {
    name = '';
  }

  const authorizedRaw = o.authorized ?? o.is_authorized ?? o.isAuthorized ?? o.logged_in;
  const authorized =
    authorizedRaw === true ||
    authorizedRaw === 1 ||
    authorizedRaw === '1' ||
    authorizedRaw === 'true';
  const checkedRaw = o.checked ?? o.is_checked ?? o.isChecked;
  const checked =
    checkedRaw == null ||
    checkedRaw === true ||
    checkedRaw === 1 ||
    checkedRaw === '1' ||
    checkedRaw === 'true';

  return {
    id: String(id),
    name,
    role,
    phone,
    authorized,
    checked,
  };
};

/** ФИО в таблице белого списка: без телефона, пустое — пробел. */
export const displayMemberName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed || looksLikePhone(trimmed)) {
    return ' ';
  }
  return trimmed;
};

/** Участники белого списка: заполнены роль и номер телефона. */
export const filterWhitelistMembers = (members: ClassMember[]): ClassMember[] =>
  members.filter((m) => isWhitelistMember(m.role, m.phone));

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
  filterWhitelistMembers(members).filter((m) => isParentRole(m.role));

export const filterStudents = (members: ClassMember[]): ClassMember[] =>
  filterWhitelistMembers(members).filter((m) => isStudentRole(m.role));

export const splitMembersByChecked = (
  members: ClassMember[],
): { confirmed: ClassMember[]; pending: ClassMember[] } => ({
  confirmed: members.filter((member) => member.checked),
  pending: members.filter((member) => !member.checked),
});

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

const EMPTY_CLASS_STATS: ClassStats = {
  events: 0,
  collections: 0,
  photos: 0,
  comments: 0,
};

export const parseClassStats = (raw: unknown): ClassStats => {
  if (!raw || typeof raw !== 'object') {
    return EMPTY_CLASS_STATS;
  }
  const o = raw as Record<string, unknown>;
  return {
    events: readNum(o.events ?? o.event_count ?? o.events_count),
    collections: readNum(o.collections ?? o.collection_count ?? o.collections_count),
    photos: readNum(o.photos ?? o.photo_count ?? o.photos_count ?? o.images),
    comments: readNum(o.comments ?? o.comment_count ?? o.comments_count),
  };
};

const readPersonName = (o: Record<string, unknown>): string => {
  const direct = readStr(o.name ?? o.fio ?? o.full_name ?? o.fullName);
  if (direct) {
    return direct;
  }
  const first = readStr(o.first_name ?? o.firstName);
  const last = readStr(o.last_name ?? o.lastName);
  if (first || last) {
    return `${last} ${first}`.trim();
  }
  return '';
};

const pickDisplayName = (...candidates: string[]): string => {
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed && !looksLikePhone(trimmed)) {
      return trimmed;
    }
  }
  return '';
};
export const parseClassTeacher = (raw: unknown): ClassTeacher => {
  if (!raw || typeof raw !== 'object') {
    return { id: '', name: '', phone: '', image: '', achievements: 0, gratitudes: 0 };
  }
  const o = raw as Record<string, unknown>;
  const id = o.id ?? o.user_id ?? o.userId;
  let name = readPersonName(o);
  let phone = readStr(o.phone ?? o.phone_number ?? o.phoneNumber);

  if (!phone && looksLikePhone(name)) {
    phone = name;
    name = '';
  }

  return {
    id: id != null && id !== '' ? String(id) : '',
    name,
    phone,
    image: readStr(o.image ?? o.avatar ?? o.photo),
    achievements: readNum(o.achievements ?? o.achievements_count ?? o.achievement_count),
    gratitudes: readNum(o.gratitudes ?? o.gratitude_count ?? o.thanks ?? o.thanks_count),
  };
};

/** Данные карточки классного руководителя на экране белого списка. */
export const resolveWhitelistTeacher = (
  classTeacher: ClassTeacher | undefined,
  teacherMembers: ClassMember[],
  members: ClassMember[] | undefined,
): {
  member: ClassMember | undefined;
  name: string;
  phone: string;
  image: string;
  inWhitelist: boolean;
  authorized: boolean;
} => {
  const headId = classTeacher?.id?.trim();
  let member: ClassMember | undefined;
  if (headId && members?.length) {
    member = members.find((m) => m.id === headId);
  }
  if (!member && teacherMembers.length) {
    member = teacherMembers[0];
  }

  const name = pickDisplayName(classTeacher?.name ?? '', member?.name ?? '');
  let phone = classTeacher?.phone?.trim() || member?.phone?.trim() || '';
  if (!phone) {
    const phoneFromName = [classTeacher?.name, member?.name].find(
      (value) => value && looksLikePhone(value),
    );
    if (phoneFromName) {
      phone = phoneFromName.trim();
    }
  }
  const inWhitelist = Boolean(
    member &&
      isWhitelistMember(member.role, member.phone) &&
      (teacherMembers.some((m) => m.id === member!.id) || isTeacherRole(member.role)),
  );

  return {
    member,
    name,
    phone,
    image: classTeacher?.image?.trim() || '',
    inWhitelist,
    authorized: member?.authorized ?? false,
  };
};

export const isStudentRole = (role: string): boolean =>
  /ученик|student|pupil|школьник/i.test(role);

export const isParentRole = (role: string): boolean =>
  /родител|parent/i.test(role);

export const isTeacherRole = (role: string): boolean =>
  /учител|teacher|классный/i.test(role);

export const filterTeachers = (members: ClassMember[]): ClassMember[] =>
  members.filter((m) => isTeacherRole(m.role));

export const isClassAdminRole = (role: string): boolean =>
  role.trim().toLowerCase() === 'admin';

const readIdValue = (raw: unknown): string => {
  if (raw == null) {
    return '';
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Math.trunc(raw));
  }
  return String(raw).trim();
};

const CREATOR_ID_KEY_RE =
  /^(creator_id|creatorid|owner_id|ownerid|user_id|userid|created_by|createdby|author_id|authorid|id_creator|member_id|memberid|uid)$/i;

/** Идентификатор создателя события из полей API. */
export const parseEventCreatorId = (o: Record<string, unknown>): string => {
  const scalarKeys = [
    'creator_id',
    'creatorId',
    'owner_id',
    'ownerId',
    'user_id',
    'userId',
    'created_by',
    'createdBy',
    'author_id',
    'authorId',
    'id_creator',
    'member_id',
    'memberId',
    'uid',
  ] as const;

  for (const key of scalarKeys) {
    const id = readIdValue(o[key]);
    if (id) {
      return id;
    }
  }

  for (const [key, value] of Object.entries(o)) {
    if (!CREATOR_ID_KEY_RE.test(key)) {
      continue;
    }
    const id = readIdValue(value);
    if (id) {
      return id;
    }
  }

  const creator = o.creator ?? o.user ?? o.author;
  if (creator != null && typeof creator === 'object' && !Array.isArray(creator)) {
    const nested = creator as Record<string, unknown>;
    const nestedId = readIdValue(
      nested.id ?? nested.user_id ?? nested.userId ?? nested.creator_id ?? nested.creatorId,
    );
    if (nestedId) {
      return nestedId;
    }
  }

  if (creator != null && typeof creator !== 'object') {
    const scalar = readIdValue(creator);
    if (/^\d+$/.test(scalar)) {
      return scalar;
    }
  }

  return '';
};

/** `creator` / `creatorId` с события. */
export const getEventCreatorId = (
  event: { creator?: string; creatorId?: string } | undefined,
): string => event?.creatorId?.trim() || event?.creator?.trim() || '';

const sameUserId = (left: string, right: string): boolean => {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const na = Number(a);
  const nb = Number(b);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
};

/** Владелец события: `creator_id` совпадает с `user_id`. */
export const isEventOwner = (
  userId: string,
  event: { creator?: string; creatorId?: string } | undefined,
): boolean => sameUserId(getEventCreatorId(event), userId);

/** Админ школы: роль в профиле или admin хотя бы в одном классе школы. */
export const canManageSchool = (
  profileRole: string,
  school: { classes: { role: string }[] },
): boolean =>
  isClassAdminRole(profileRole) ||
  school.classes.some((c) => isClassAdminRole(c.role));

/** Админ класса: роль в профиле или admin в этом классе. */
export const canManageClass = (profileRole: string, classRole: string): boolean =>
  isClassAdminRole(profileRole) || isClassAdminRole(classRole);

export const countMembersByRole = (members: ClassMember[]): {
  studentCount: number;
  parentCount: number;
} => {
  const whitelist = filterWhitelistMembers(members);
  return {
    studentCount: whitelist.filter((m) => isStudentRole(m.role)).length,
    parentCount: whitelist.filter((m) => !isStudentRole(m.role) && !isTeacherRole(m.role)).length,
  };
};

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

  const events = parseEventsList(o.events);

  return {
    id: String(id),
    name: name || fallback.name || '',
    role: readStr(o.role ?? o.user_role ?? o.my_role ?? o.class_role),
    teacher: parseClassTeacher(o.teacher ?? o.class_teacher ?? o.classTeacher),
    members,
    events,
    stats: parseClassStats(o.stats),
  };
};

export const parseSchoolClassRow = (row: unknown): SchoolClass | null => {
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
    role: readStr(o.role ?? o.user_role ?? o.class_role),
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
    .filter((item): item is SchoolClass => item !== null);

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
      role: cls.role ?? '',
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

/** Ответ `get_event`: событие и опционально контекст класса/школы. */
export const parsePublicEventData = (raw: unknown): PublicEventData | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const eventRaw = o.event ?? o.Event ?? o.data ?? raw;
  const event = parseClassEvent(eventRaw);
  if (!event) {
    return null;
  }

  const classId = readStr(o.class_id ?? o.classId);
  const className = readStr(o.class_name ?? o.className);
  const schoolId = readStr(o.school_id ?? o.schoolId);
  const schoolName = readStr(o.school_name ?? o.schoolName);

  return {
    event,
    ...(classId ? { classId } : {}),
    ...(className ? { className } : {}),
    ...(schoolId ? { schoolId } : {}),
    ...(schoolName ? { schoolName } : {}),
  };
};
