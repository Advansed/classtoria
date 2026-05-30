import { api, type ApiResponse } from '../../api';
import { normalizePhoneDigits } from '../../authCookies';

export type AddChildParams = {
  token: string;
  classId: string;
  parentId: string;
  name: string;
  phone: string;
  /** Ключ файла в хранилище (поле `image` в Childrens). */
  image?: string;
};

/** Ключ аватара ребёнка в хранилище по составному ключу Childrens. */
export function childImageKey(classId: string, parentId: string, phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return `children/${parentId.trim()}/${classId.trim()}/${digits}/avatar.png`;
}

/** `post('add_child', { token, class_id, parent_id, phone, name, image? })` → таблица Childrens. */
export async function addChild(params: AddChildParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const parentId = params.parentId.trim();
  const name = params.name.trim();
  const phone = normalizePhoneDigits(params.phone);
  const image = params.image?.trim() ?? '';

  if (!trimmedToken || !classId || !parentId || !name || !phone) {
    return {
      success: false,
      data: null,
      message: 'Заполните все поля',
    };
  }

  return api('add_child', {
    token: trimmedToken,
    class_id: classId,
    parent_id: parentId,
    phone,
    name,
    ...(image ? { image } : {}),
  });
}
