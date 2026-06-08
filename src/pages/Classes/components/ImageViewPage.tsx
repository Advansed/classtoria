import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from '../../../Store';
import { useClassesStore } from '../classesStore';
import { CLASSES_COLLECTION_VIEW } from '../routes';
import type { CollectionViewRouteState, ImageViewRouteState } from '../types';
import {
  collectionMediaItems,
  findCollectionInEvent,
  findEventInList,
  findImageInCollection,
  imageThumbRaw,
} from './classViewUtils';
import CollectionMediaModal from './CollectionMediaModal';
import './ImageViewPage.css';

const ImageViewPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ImageViewRouteState>();
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
  const mediaItems = useMemo(
    () => collectionMediaItems(collection).filter((img) => imageThumbRaw(img)),
    [collection],
  );
  const image = useMemo(
    () => findImageInCollection(collection, imageId, imageIndex),
    [collection, imageId, imageIndex],
  );

  const viewerIndex = useMemo(() => {
    if (!image || mediaItems.length === 0) {
      return -1;
    }
    if (imageId) {
      const byId = mediaItems.findIndex((item) => item.imageId === imageId);
      if (byId >= 0) {
        return byId;
      }
    }
    if (imageIndex != null && imageIndex >= 0 && imageIndex < mediaItems.length) {
      return imageIndex;
    }
    const byRef = mediaItems.indexOf(image);
    return byRef >= 0 ? byRef : 0;
  }, [image, imageId, imageIndex, mediaItems]);

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

  const handleClose = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push(CLASSES_COLLECTION_VIEW, collectionBackState);
  };

  const handleIndexChange = (nextIndex: number) => {
    const nextImage = mediaItems[nextIndex];
    if (!nextImage) {
      return;
    }
    const nextState: ImageViewRouteState = {
      ...state,
      ...(nextImage.imageId ? { imageId: nextImage.imageId } : {}),
      imageIndex: nextIndex,
    };
    history.replace(location.pathname, nextState);
  };

  return (
    <IonPage className="image-view">
      <IonContent fullscreen className="image-view__content">
        {loading && !classDetail ? (
          <div className="image-view__loading" role="status">
            <IonSpinner name="crescent" />
            <p>Загрузка…</p>
          </div>
        ) : null}

        {!loading && !image ? (
          <p className="image-view__error" role="alert">
            Материал не найден.
          </p>
        ) : null}
      </IonContent>

      <CollectionMediaModal
        open={!loading && viewerIndex >= 0}
        items={mediaItems}
        index={Math.max(viewerIndex, 0)}
        token={token}
        showActions
        onClose={handleClose}
        onIndexChange={handleIndexChange}
      />
    </IonPage>
  );
};

export default ImageViewPage;
