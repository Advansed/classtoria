/** Изображение в коллекции события класса. */
export type ClassImage = {
  date:                   string;
  preview:                string;
  file:                   string;
};

/** Коллекция материалов внутри события. */
export type ClassCollection = {
  date:                   string;
  name:                   string;
  title:                  string;
  images:                 ClassImage[];
};

/** Событие класса. */
export type ClassEvent = {
  title:                  string;
  date:                   string;
  collections:            ClassCollection[];
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
};

/** Классный руководитель. */
export type ClassTeacher = {
  id:                     string;
  name:                   string;
  image:                  string;
  achievements:         number;
  gratitudes:             number;
};

/** Полные данные класса для ЛК (`get_class`). */
export type ClassDetail = {
  id:                     string;
  name:                   string;
  teacher:                ClassTeacher;
  members:                ClassMember[];
  events:                 ClassEvent[];
};

/** Параметры `get_class` / открытия ЛК класса. */
export type GetClassParams = {
  token:                  string;
  classId:                string;
  schoolId?:              string;
  name?:                  string;
};

export type OpenClassParams = GetClassParams;
