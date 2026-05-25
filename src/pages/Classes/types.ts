/** Изображение в коллекции события класса. */
export type ClassImage = {
  date:                   string;
  preview:                string;
  file:                   string;
  imageId?:               string;
};

/** Комментарий к событию (если приходит в `get_class`). */
export type EventComment = {
  id:                     string;
  authorName:             string;
  authorRole:             string;
  text:                   string;
  avatar?:                string;
};

/** Коллекция материалов внутри события. */
export type ClassCollection = {
  id?:                    string;
  date:                   string;
  name:                   string;
  title:                  string;
  /** Имя автора коллекции для списка на экране события. */
  creatorName?:           string;
  images:                 ClassImage[];
};

/** Событие класса. */
export type ClassEvent = {
  id?:                    string;
  title:                  string;
  /** Дата/период события (в API — `period`, в UI — «Дата»). */
  date:                   string;
  description?:           string;
  collections:            ClassCollection[];
  comments?:              EventComment[];
  /** Число видеороликов, если отдаёт API. */
  videoCount?:            number;
};

/** Участник класса (белый список). */
export type ClassMember = {
  id:                     string;
  name:                   string;
  role:                   string;
  phone:                  string;
  authorized:             boolean;
};

/** Параметры навигации в экраны класса. */
export type ClassRouteState = {
  schoolId?:              string;
  schoolName?:            string;
  classId?:               string;
  className?:             string;
  /** После создания события — выбрать его на экране загрузки. */
  selectEventTitle?:      string;
};

/** Контекст загрузки коллекции в выбранное событие. */
export type CollectionUploadRouteState = ClassRouteState & {
  eventTitle:             string;
  eventDate:              string;
  eventDescription:       string;
  eventId?:               string;
  /** После создания коллекции — выбрать её на экране загрузки фото. */
  selectCollectionName?:  string;
};

/** Просмотр события: идентификатор или индекс в списке `events`. */
export type EventViewRouteState = ClassRouteState & {
  eventId?:               string;
  eventIndex?:            number;
};

/** Классный руководитель. */
export type ClassTeacher = {
  id:                     string;
  name:                   string;
  phone:                  string;
  image:                  string;
  achievements:         number;
  gratitudes:             number;
};

/** Статистика класса (`stats` в ответе `get_class`). */
export type ClassStats = {
  events:                 number;
  collections:            number;
  photos:                 number;
  comments:               number;
};

/** Полные данные класса для ЛК (`get_class`). */
export type ClassDetail = {
  id:                     string;
  name:                   string;
  /** Роль текущего пользователя в этом классе (например `admin`). */
  role:                   string;
  teacher:                ClassTeacher;
  members:                ClassMember[];
  events:                 ClassEvent[];
  stats:                  ClassStats;
};

/** Параметры `get_class` / открытия ЛК класса. */
export type GetClassParams = {
  token:                  string;
  classId:                string;
  schoolId?:              string;
  name?:                  string;
};

export type OpenClassParams = GetClassParams;
