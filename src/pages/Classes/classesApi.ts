import { api, type ApiResponse } from '../../api';
import { normalizePhoneDigits } from '../../authCookies';
import type { UserClass, UserSchool } from '../../Store';
import type { ClassDetail, GetClassParams, PublicEventData } from './types';
import {
  flattenSchoolClasses,
  parseClassDetail,
  parsePublicEventData,
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

export type AddSchoolParams = {
  token: string;
  name: string;
  region: string;
  location: string;
};

/** `post('add_school', { token, name, region, location })`. */
export async function addSchool(params: AddSchoolParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const name = params.name.trim();
  const region = params.region.trim();
  const location = params.location.trim();

  if (!trimmedToken || !name) {
    return {
      success: false,
      data: null,
      message: 'Укажите название школы',
    };
  }

  return api('add_school', {
    token: trimmedToken,
    name,
    region,
    location,
  });
}

export type AddClassParams = {
  token: string;
  name: string;
  schoolId: string;
};

/** `post('add_class', { token, name, school_id })`. */
export async function addClass(params: AddClassParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const name = params.name.trim();
  const schoolId = params.schoolId.trim();

  if (!trimmedToken || !name || !schoolId) {
    return {
      success: false,
      data: null,
      message: 'Укажите название класса и школу',
    };
  }

  return api('add_class', {
    token: trimmedToken,
    name,
    school_id: schoolId,
  });
}

export type EditSchoolParams = {
  token: string;
  schoolId: string;
  name: string;
};

/** `post('set_school', { token, school_id, name })`. */
export async function editSchool(params: EditSchoolParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const schoolId = params.schoolId.trim();
  const name = params.name.trim();

  if (!trimmedToken || !schoolId || !name) {
    return {
      success: false,
      data: null,
      message: 'Укажите название школы',
    };
  }

  return api('set_school', {
    token: trimmedToken,
    school_id: schoolId,
    name,
  });
}

export type EditClassParams = {
  token: string;
  classId: string;
  name: string;
};

/** `post('edit_class', { token, class_id, name })`. */
export async function editClass(params: EditClassParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const name = params.name.trim();

  if (!trimmedToken || !classId || !name) {
    return {
      success: false,
      data: null,
      message: 'Укажите название класса',
    };
  }

  return api('edit_class', {
    token: trimmedToken,
    class_id: classId,
    name,
  });
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

export type GetEventParams = {
  eventId: string;
};

/** `post('get_event', { event_id })` — публичные данные события без токена. */
export async function getEvent(params: GetEventParams): Promise<PublicEventData | null> {
  const eventId = params.eventId.trim();
  if (!eventId) {
    return null;
  }

  const res: ApiResponse<unknown> = await api('get_event', { event_id: eventId });
  if (!res.success) {
    return null;
  }

  if (res.data != null) {
    return parsePublicEventData(res.data);
  }

  return parsePublicEventData(res);
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

export type SetMemberParams = {
  token: string;
  classId: string;
  id: string;
};

/** `post('set_member', { token, class_id, id })` — подтверждение в белом списке. */
export async function setMember(params: SetMemberParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const id = params.id.trim();

  if (!trimmedToken || !classId || !id) {
    return {
      success: false,
      data: null,
      message: 'Недостаточно данных для подтверждения',
    };
  }

  return api('set_member', {
    token: trimmedToken,
    class_id: classId,
    id,
  });
}

export type DeleteMemberParams = {
  token: string;
  classId: string;
  id: string;
};

/** `post('del_member', { token, class_id, id })` — удаление участника из белого списка. */
export async function deleteMember(params: DeleteMemberParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const id = params.id.trim();

  if (!trimmedToken || !classId || !id) {
    return {
      success: false,
      data: null,
      message: 'Недостаточно данных для удаления',
    };
  }

  return api('del_member', {
    token: trimmedToken,
    class_id: classId,
    id,
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

export type EditEventParams = {
  token: string;
  eventId: string;
  name: string;
  date: string;
};

/** `post('edit_event', { token, event_id, name, date })`. */
export async function editEvent(params: EditEventParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const eventId = params.eventId.trim();
  const name = params.name.trim();
  const date = params.date.trim();

  if (!trimmedToken || !eventId || !name || !date) {
    return {
      success: false,
      data: null,
      message: 'Укажите название и дату события',
    };
  }

  return api('edit_event', {
    token: trimmedToken,
    event_id: eventId,
    name,
    date,
  });
}

export type AddCollectionParams = {
  token: string;
  eventId: string;
  name: string;
};

export type EditCollectionParams = {
  token: string;
  collectionId: string;
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

/** `post('edit_collection', { token, collection_id, name })` — переименование фотосессии. */
export async function editCollection(params: EditCollectionParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const collectionId = params.collectionId.trim();
  const name = params.name.trim();

  if (!trimmedToken || !collectionId || !name) {
    return {
      success: false,
      data: null,
      message: 'Укажите название фотосессии',
    };
  }

  return api('edit_collection', {
    token: trimmedToken,
    collection_id: collectionId,
    name,
  });
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
  /** `video` — участник коллекции с видеофайлом. */
  mediaType?: 'image' | 'video';
  /** Длительность видео, например `1:23`. */
  duration?: string;
};

/** `post('add_image', { token, collection_id, image_id, file, preview, type?, duration? })`. */
export async function addImage(params: AddImageParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const collectionId = params.collectionId.trim();
  const imageId = params.imageId.trim();
  const file = params.file.trim();
  const preview = params.preview.trim();

  const fileurl = params.fileurl.trim();
  const previewurl = params.previewurl.trim();
  const mediaType = params.mediaType;
  const duration = params.duration?.trim() ?? '';

  if (!trimmedToken || !collectionId || !imageId || !file || !preview || !fileurl || !previewurl) {
    return {
      success: false,
      data: null,
      message: 'Нет данных для загрузки материала',
    };
  }

  const body: Record<string, string> = {
    token: trimmedToken,
    collection_id: collectionId,
    image_id: imageId,
    file,
    preview,
    fileurl,
    previewurl,
  };
  if (mediaType === 'video') {
    body.type = 'video';
    if (duration) {
      body.duration = duration;
    }
  }

  const res = await api('add_image', body);

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

export type AddVideoParams = {
  token: string;
  collectionId: string;
  imageId: string;
  file: string;
  preview: string;
  fileurl: string;
  previewurl: string;
  duration: string;
};

/** `post('add_video', { token, collection_id, image_id, file, preview, fileurl, previewurl, duration })`. */
export async function addVideo(params: AddVideoParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const collectionId = params.collectionId.trim();
  const imageId = params.imageId.trim();
  const file = params.file.trim();
  const preview = params.preview.trim();
  const fileurl = params.fileurl.trim();
  const previewurl = params.previewurl.trim();
  const duration = params.duration.trim();

  if (
    !trimmedToken ||
    !collectionId ||
    !imageId ||
    !file ||
    !preview ||
    !fileurl ||
    !previewurl ||
    !duration
  ) {
    return {
      success: false,
      data: null,
      message: 'Нет данных для загрузки видео',
    };
  }

  const res = await api('add_video', {
    token: trimmedToken,
    collection_id: collectionId,
    image_id: imageId,
    file,
    preview,
    fileurl,
    previewurl,
    duration,
  });

  console.log('[collection-upload] add_video (API)', {
    success: res.success,
    message: res.message,
    collection_id: collectionId,
    image_id: imageId,
    file,
    preview,
    fileurl,
    previewurl,
    duration,
  });

  return res;
}

export type DelVideoParams = {
  token: string;
  collectionId: string;
  imageId?: string;
};

/** `post('del_video', { token, collection_id, image_id? })` — удаление видео фотосессии. */
export async function delVideo(params: DelVideoParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const collectionId = params.collectionId.trim();
  const imageId = params.imageId?.trim() ?? '';

  if (!trimmedToken || !collectionId) {
    return {
      success: false,
      data: null,
      message: 'Нет данных для удаления видео',
    };
  }

  const body: { token: string; collection_id: string; image_id?: string } = {
    token: trimmedToken,
    collection_id: collectionId,
  };
  if (imageId) {
    body.image_id = imageId;
  }

  const res = await api('del_video', body);

  console.log('[collection-upload] del_video (API)', {
    success: res.success,
    message: res.message,
    collection_id: collectionId,
    image_id: imageId || undefined,
  });

  return res;
}

export type DeleteImageParams = {
  token: string;
  imageId: string;
};

/** `post('del_image', { token, image_id })` — удаление фото из коллекции. */
export async function deleteImage(params: DeleteImageParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const imageId = params.imageId.trim();

  if (!trimmedToken || !imageId) {
    return {
      success: false,
      data: null,
      message: 'Нет данных для удаления фото',
    };
  }

  const res = await api('del_image', {
    token: trimmedToken,
    image_id: imageId,
  });

  console.log('[collection-upload] del_image (API)', {
    success: res.success,
    message: res.message,
    image_id: imageId,
  });

  return res;
}

export type AddFavoriteParams = {
  token: string;
  imageId: string;
};

/** `post('add_favorite', { token, image_id })` — добавить фото в избранное. */
export async function addFavorite(params: AddFavoriteParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const imageId = params.imageId.trim();

  if (!trimmedToken || !imageId) {
    return {
      success: false,
      data: null,
      message: 'Нет данных для добавления в избранное',
    };
  }

  return api('add_favorite', {
    token: trimmedToken,
    image_id: imageId,
  });
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
