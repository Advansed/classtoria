import { api, type ApiResponse } from '../../api';
import { normalizePhoneDigits } from '../../authCookies';

export type AddChildParams = {
  token: string;
  classId: string;
  parentId: string;
  userId: string;
  name: string;
  phone: string;
};

export function generateChildUserId(): string {
  return crypto.randomUUID();
}

/** Ключ в хранилище: `<user_id>/avatar.png`. */
export function childAvatarFilename(userId: string): string {
  return `${userId.trim()}/avatar.png`;
}

/** `post('add_child', { token, class_id, parent_id, user_id, name, phone })`. */
export async function addChild(params: AddChildParams): Promise<ApiResponse<unknown>> {
  const trimmedToken = params.token.trim();
  const classId = params.classId.trim();
  const parentId = params.parentId.trim();
  const userId = params.userId.trim();
  const name = params.name.trim();
  const phone = normalizePhoneDigits(params.phone);

  if (!trimmedToken || !classId || !parentId || !userId || !name || !phone) {
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
    user_id: userId,
    name,
    phone,
  });
}
