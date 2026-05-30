/** Запись в таблице Childrens (ключ: class_id + parent_id + phone). */
export type ChildRecord = {
  class_id: string;
  parent_id: string;
  phone: string;
  name: string;
  /** Ключ файла в хранилище, например `children/<parent_id>/<class_id>/<phone>/avatar.png`. */
  image: string;
};
