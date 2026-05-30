import { normalizePhoneDigits } from '../../authCookies';
import type { ChildRecord } from './childrenTypes';

const readStr = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : String(value ?? '').trim();

export const parseChildRow = (row: unknown): ChildRecord | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const class_id = readStr(o.class_id ?? o.classId);
  const parent_id = readStr(o.parent_id ?? o.parentId);
  const phone = normalizePhoneDigits(readStr(o.phone));
  const name = readStr(o.name);
  const image = readStr(o.image);

  if (!class_id || !parent_id || !phone) {
    return null;
  }

  return { class_id, parent_id, phone, name, image };
};

export const parseChildrenList = (raw: unknown): ChildRecord[] => {
  if (!raw) {
    return [];
  }
  const rows = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && Array.isArray((raw as { childrens?: unknown }).childrens)
      ? (raw as { childrens: unknown[] }).childrens
      : [];
  return rows
    .map(parseChildRow)
    .filter((item): item is ChildRecord => item !== null);
};

/** Извлечь массив детей из ответа login / get_children. */
export const parseChildrenFromApi = (res: {
  childrens?: unknown;
  children?: unknown;
  data?: unknown;
}): ChildRecord[] => {
  if (res.childrens != null) {
    return parseChildrenList(res.childrens);
  }
  if (res.children != null) {
    return parseChildrenList(res.children);
  }
  if (Array.isArray(res.data)) {
    return parseChildrenList(res.data);
  }
  if (res.data && typeof res.data === 'object') {
    const data = res.data as { childrens?: unknown; children?: unknown };
    if (data.childrens != null) {
      return parseChildrenList(data.childrens);
    }
    if (data.children != null) {
      return parseChildrenList(data.children);
    }
  }
  return [];
};

export const childRecordKey = (child: ChildRecord): string =>
  `${child.class_id}:${child.parent_id}:${child.phone}`;

/** Добавить или обновить ребёнка в списке (после add_child, если API не вернул childrens). */
export const upsertChild = (list: ChildRecord[], child: ChildRecord): ChildRecord[] => {
  const key = childRecordKey(child);
  return [...list.filter((item) => childRecordKey(item) !== key), child];
};
