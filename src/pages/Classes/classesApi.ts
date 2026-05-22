import { api, type ApiResponse } from '../../api';
import { normalizePhoneDigits } from '../../authCookies';
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

  console.log("get_classes response", res);

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

  console.log("get_class response", res);

  const fallback = { id, name: params.name };
  if (res.data != null) {
    return parseClassDetail(res.data, fallback);
  }

  return parseClassDetail(res, fallback);
}

export type AddMemberParams = {
  token:                  string;
  classId:                string;
  phone:                  string;
  role:                   string;
};

/** `post('add_member', { token, class_id, phone, role })`. */
export async function addMember(params: AddMemberParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const phone = normalizePhoneDigits(params.phone);
  const role = params.role.trim();

  if (!trimmedToken || !classId || !phone || !role) {
    return {
      success: false,
      data: null,
      message: 'Заполните все поля',
    };
  }

  return api('add_member', {
    token: trimmedToken,
    class_id: classId,
    phone,
    role,
  });
}

export type AddEventParams = {
  token:                  string;
  classId:                string;
  name:                   string;
  date:                   string;
  description?:           string;
};

/** `post('add_event', { token, class_id, name, period, description? })`. */
export async function addEvent(params: AddEventParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const name = params.name.trim();
  const period = params.date.trim();
  const description = params.description?.trim();

  if (!trimmedToken || !classId || !name || !period) {
    return {
      success: false,
      data: null,
      message: 'Заполните событие и дату',
    };
  }

  const body: {
    token: string;
    class_id: string;
    name: string;
    period: string;
    description?: string;
  } = {
    token: trimmedToken,
    class_id: classId,
    name,
    period,
  };

  if (description) {
    body.description = description;
  }

  return api('add_event', body);
}

export type AddCollectionParams = {
  token: string;
  eventId: string;
  name: string;
};

export type AddCollectionData = {
  id: string;
  name: string;
  creator_id?: string;
  images: unknown[];
};

const readCollectionId = (source: unknown): string => {
  if (!source || typeof source !== 'object') {
    return '';
  }
  const o = source as Record<string, unknown>;
  const raw = o.id ?? o.collection_id ?? o.collectionId;
  return raw != null ? String(raw).trim() : '';
};

const parseAddCollectionData = (source: unknown): AddCollectionData | null => {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const o = source as Record<string, unknown>;
  const id = readCollectionId(o);
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!id || !name) {
    return null;
  }
  const images = Array.isArray(o.images) ? o.images : [];
  const creatorRaw = o.creator_id ?? o.creatorId;
  return {
    id,
    name,
    ...(creatorRaw != null ? { creator_id: String(creatorRaw) } : {}),
    images,
  };
};

/** `post('add_collection', { token, event_id, name })` → `data: { id, name, creator_id, images }`. */
export async function addCollection(
  params: AddCollectionParams,
): Promise<ApiResponse<unknown> & { collectionId?: string; collection?: AddCollectionData }> {
  const trimmedToken = params.token.trim();
  const eventId = params.eventId.trim();
  const name = params.name.trim();

  if (!trimmedToken || !eventId || !name) {
    return {
      success: false,
      data: null,
      message: 'Укажите название коллекции и событие',
    };
  }

  const res: ApiResponse<unknown> = await api('add_collection', {
    token: trimmedToken,
    event_id: eventId,
    name,
  });

  const collection = parseAddCollectionData(res.data);
  const collectionId = collection?.id ?? readCollectionId(res.data) ?? readCollectionId(res) ?? '';

  console.log('[collection-upload] add_collection (API)', {
    success: res.success,
    message: res.message,
    data: collection ?? res.data,
  });

  return {
    ...res,
    collectionId: collectionId || undefined,
    collection: collection ?? undefined,
  };
}

export type AddImageParams = {
  token: string;
  collectionId: string;
  imageId: string;
  /** Путь в хранилище, например `classId/eventId/collectionId/imageId/file.jpg`. */
  file: string;
  /** Путь preview, например `.../preview.jpg`. */
  preview: string;
  /** public_url после загрузки file.jpg. */
  fileurl: string;
  /** public_url после загрузки preview.jpg. */
  previewurl: string;
};

/** `post('add_image', { token, collection_id, image_id, file, preview })`. */
export async function addImage(params: AddImageParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const collectionId = params.collectionId.trim();
  const imageId = params.imageId.trim();
  const file = params.file.trim();
  const preview = params.preview.trim();

  const fileurl = params.fileurl.trim();
  const previewurl = params.previewurl.trim();

  if (!trimmedToken || !collectionId || !imageId || !file || !preview || !fileurl || !previewurl) {
    return {
      success: false,
      data: null,
      message: 'Нет данных для загрузки фото',
    };
  }

  const res = await api('add_image', {
    token: trimmedToken,
    collection_id: collectionId,
    image_id: imageId,
    file,
    preview,
    fileurl,
    previewurl,
  });

  console.log('[collection-upload] add_image (API)', {
    success: res.success,
    message: res.message,
    collection_id: collectionId,
    image_id: imageId,
    file,
    preview,
    fileurl,
    previewurl,
  });

  return res;
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
