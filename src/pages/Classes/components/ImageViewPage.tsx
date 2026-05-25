import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { MessageCircle, UserPlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { useClassesStore } from '../classesStore';
import { CLASSES_COLLECTION_VIEW } from '../routes';
import type { CollectionViewRouteState, ImageViewRouteState } from '../types';
import ClassesNavBackButton from './ClassesNavBackButton';
import {
  findCollectionInEvent,
  findEventInList,
  findImageInCollection,
  imageFullRaw,
} from './classViewUtils';
import { useClassImageSrc } from './useClassImageSrc';
import './ImageViewPage.css';

const ImageViewPage: React.FC = () => {
  const location = useLocation<ImageViewRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const loadClass = useClassesStore((s) => s.loadClass);
  const loading = useClassesStore((s) => s.loading);

  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const classNameFromRoute = state.className?.trim() || '';
  const eventId = state.eventId?.trim() || '';
  const eventIndex = state.eventIndex;
  const collectionId = state.collectionId?.trim() || '';
  const collectionIndex = state.collectionIndex;
  const imageId = state.imageId?.trim() || '';
  const imageIndex = state.imageIndex;

  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));

  useEffect(() => {
    if (!classId || !token?.trim()) {
      return;
    }
    void loadClass({
      classId,
      schoolId,
      token,
      name: classNameFromRoute,
    });
  }, [classId, schoolId, token, classNameFromRoute, loadClass]);

  const event = useMemo(
    () => findEventInList(classDetail?.events ?? [], eventId, eventIndex),
    [classDetail?.events, eventId, eventIndex],
  );
  const collection = useMemo(
    () => findCollectionInEvent(event, collectionId, collectionIndex),
    [event, collectionId, collectionIndex],
  );
  const image = useMemo(
    () => findImageInCollection(collection, imageId, imageIndex),
    [collection, imageId, imageIndex],
  );

  const photoSrc = useClassImageSrc(token, image ? imageFullRaw(image) : '');

  const openComment = () => {
    toast.show('Комментарии к фото скоро будут доступны');
  };

  const tagChild = () => {
    toast.show('Отметка ребёнка скоро будет доступна');
  };

  const collectionBackState = useMemo(
    (): CollectionViewRouteState => ({
      schoolId: state.schoolId,
      schoolName: state.schoolName,
      classId: state.classId,
      className: state.className,
      eventId: state.eventId,
      eventIndex: state.eventIndex,
      eventTitle: state.eventTitle,
      eventDate: state.eventDate,
      collectionId: state.collectionId,
      collectionIndex: state.collectionIndex,
    }),
    [state],
  );

  return (
    <IonPage>
      <IonHeader className="image-view__header">
        <IonToolbar>
          <ClassesNavBackButton
            fallbackHref={CLASSES_COLLECTION_VIEW}
            fallbackState={collectionBackState}
            className="image-view__back"
          />
          <IonTitle className="image-view__toolbar-title">Фотография</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="image-view__content">
        <div className="image-view__wrap">
          {loading && !classDetail ? (
            <div className="image-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && !image ? (
            <p className="image-view__error" role="alert">
              Фотография не найдена.
            </p>
          ) : null}

          {image ? (
            <div className="image-view__stage">
              <img src={photoSrc} alt="" className="image-view__photo" />
            </div>
          ) : null}

          {image ? (
            <div className="image-view__actions">
              <button type="button" className="image-view__action-btn" onClick={openComment}>
                <MessageCircle size={22} aria-hidden />
                Комментарий
              </button>
              <button type="button" className="image-view__action-btn" onClick={tagChild}>
                <UserPlus size={22} aria-hidden />
                <span>Отметить ребёнка</span>
                <p className="image-view__action-hint">Фото сохраняется в ЛК ребёнка</p>
              </button>
            </div>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ImageViewPage;
