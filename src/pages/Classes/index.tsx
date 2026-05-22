/**
 * Раздел «ЛК класса».
 * Маршруты регистрируются в PersonalPage (прямые потомки IonRouterOutlet вкладки).
 */
export { default as Schools } from './components/Schools';
export { default as ClassCabinetPage } from './components/ClassCabinetPage';
export { default as ClassWhitelistPage } from './ClassWhitelistPage';
export { default as EventUploadPage } from './components/EventUploadPage';
export { default as CreateEventPage } from './components/CreateEventPage';
export { default as CollectionUploadPage } from './components/CollectionUploadPage';
export { default as CreateCollectionPage } from './components/CreateCollectionPage';
export { default as EventViewPage } from './components/EventViewPage';
export {
  CLASSES_BASE,
  CLASSES_CABINET,
  CLASSES_COLLECTION_CREATE,
  CLASSES_COLLECTION_UPLOAD,
  CLASSES_EVENT_CREATE,
  CLASSES_EVENT_VIEW,
  CLASSES_UPLOAD,
  CLASSES_WHITELIST,
} from './routes';
