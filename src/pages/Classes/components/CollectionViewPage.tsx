import {
  IonAlert,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { createOutline } from 'ionicons/icons';
import { Calendar, Crown, MessageCircle, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { editCollection } from '../classesApi';
import { useClassesStore } from '../classesStore';
import { CLASSES_EVENT_VIEW } from '../routes';
import type { ClassImage, CollectionViewRouteState, EventViewRouteState } from '../types';
import ClassesNavBackButton from './ClassesNavBackButton';
import CollectionMediaModal from './CollectionMediaModal';
import { collectionLabel } from './collectionFormUtils';
import {
  collectionMediaItems,
  findCollectionInEvent,
  findEventInList,
  formatEventMetaLine,
  imageStatsLabel,
  imageThumbRaw,
  isCollectionVideo,
} from './classViewUtils';
import { isEventOwner } from '../utils';
import { useClassImageSrc } from './useClassImageSrc';
import './CollectionViewPage.css';

const ICON_SIZE = 20;

type PhotoTileProps = {
  image: ClassImage;
  token: string | null;
  onOpen: () => void;
};

const PhotoTile: React.FC<PhotoTileProps> = ({ image, token, onOpen }) => {
  const src = useClassImageSrc(token, imageThumbRaw(image));
  const isVideo = isCollectionVideo(image);

  return (
    <button
      type="button"
      className="collection-view__photo-btn"
      aria-label={isVideo ? 'Открыть видео' : 'Открыть фото'}
      onClick={onOpen}
    >
      <img src={src} alt="" loading="lazy" />
      {isVideo ? (
        <span className="collection-view__photo-play" aria-hidden>
          <Video size={28} />
        </span>
      ) : null}
      {image.featured ? (
        <span className="collection-view__photo-crown" aria-label="Избранное">
          <Crown size={16} aria-hidden />
        </span>
      ) : null}
      <span className="collection-view__photo-stats">
        <MessageCircle size={14} aria-hidden />
        {imageStatsLabel(image)}
      </span>
    </button>
  );
};

const CollectionViewPage: React.FC = () => {
  const location = useLocation<CollectionViewRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const userId = useStore((s) => s.user_id);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const loadClass = useClassesStore((s) => s.loadClass);
  const loading = useClassesStore((s) => s.loading);

  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute = state.className?.trim() || '';
  const eventId = state.eventId?.trim() || '';
  const eventIndex = state.eventIndex;
  const collectionId = state.collectionId?.trim() || '';
  const collectionIndex = state.collectionIndex;
  const eventTitle = state.eventTitle?.trim() || '—';
  const eventDate = state.eventDate?.trim() || '—';

  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [submittingEditName, setSubmittingEditName] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  const displayClassName = classDetail?.name || classNameFromRoute || '—';
  const event = useMemo(
    () => findEventInList(classDetail?.events ?? [], eventId, eventIndex),
    [classDetail?.events, eventId, eventIndex],
  );
  const collection = useMemo(
    () => findCollectionInEvent(event, collectionId, collectionIndex),
    [event, collectionId, collectionIndex],
  );

  const collectionTitle = collection ? collectionLabel(collection) : '—';
  const canEdit = isEventOwner(userId, event);
  const mediaItems = useMemo(
    () =>
      collectionMediaItems(collection).filter((img) => imageThumbRaw(img)),
    [collection],
  );

  const openMedia = (index: number) => {
    setViewerIndex(index);
  };

  const submitEditCollection = async (name: string) => {
    const trimmedToken = token?.trim() ?? '';
    const currentCollectionId = collection?.id?.trim() || collectionId;
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!currentCollectionId) {
      toast.warning('У фотосессии нет id');
      return;
    }
    if (!name) {
      toast.warning('Укажите название фотосессии');
      return;
    }

    setSubmittingEditName(true);
    try {
      const res = await editCollection({
        token: trimmedToken,
        collectionId: currentCollectionId,
        name,
      });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось изменить название фотосессии');
        return;
      }
      toast.success(res.message?.trim() || 'Название фотосессии обновлено');
      setEditNameOpen(false);
      if (classId) {
        await loadClass({
          classId,
          schoolId,
          token: trimmedToken,
          name: classNameFromRoute,
        });
      }
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmittingEditName(false);
    }
  };

  const eventBackState = useMemo(
    (): EventViewRouteState => ({
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
      eventId: state.eventId,
      eventIndex: state.eventIndex,
      ...((event?.creatorId ?? event?.creator)?.trim()
        ? { eventCreatorId: (event.creatorId ?? event.creator)!.trim() }
        : {}),
    }),
    [
      schoolId,
      schoolName,
      classId,
      displayClassName,
      state.eventId,
      state.eventIndex,
      event?.creator,
      event?.creatorId,
    ],
  );

  return (
    <IonPage>
      <IonHeader className="collection-view__header">
        <IonToolbar>
          <ClassesNavBackButton
            fallbackHref={CLASSES_EVENT_VIEW}
            fallbackState={eventBackState}
            className="collection-view__back"
          />
          <IonTitle className="collection-view__toolbar-title">Фотосессия</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="collection-view">
        <div className="collection-view__scroll">
          {loading && !classDetail ? (
            <div className="collection-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && !collection ? (
            <p className="collection-view__error" role="alert">
              Фотосессия не найдена.
            </p>
          ) : null}

          {collection ? (
            <>
              <article className="collection-view__event-card">
                <Calendar size={ICON_SIZE} className="collection-view__event-icon" aria-hidden />
                <div>
                  <p className="collection-view__event-label">Событие</p>
                  <h1 className="collection-view__event-title">{event?.title ?? eventTitle}</h1>
                  <p className="collection-view__event-meta">
                    {formatEventMetaLine(event?.date ?? eventDate, schoolName, displayClassName)}
                  </p>
                </div>
              </article>

              <div className="collection-view__collection-head">
                <h2 className="collection-view__collection-title">{collectionTitle}</h2>
                {canEdit ? (
                  <button
                    type="button"
                    className="collection-view__edit-btn"
                    aria-label="Редактировать фотосессию"
                    disabled={submittingEditName}
                    onClick={() => setEditNameOpen(true)}
                  >
                    <IonIcon icon={createOutline} aria-hidden />
                  </button>
                ) : null}
              </div>

              {mediaItems.length === 0 ? (
                <p className="collection-view__empty">
                  В этой фотосессии пока нет фотографий и видео.
                </p>
              ) : (
                <div className="collection-view__grid">
                  {mediaItems.map((img, index) => (
                    <PhotoTile
                      key={img.imageId ?? `photo-${index}-${imageThumbRaw(img)}`}
                      image={img}
                      token={token}
                      onOpen={() => openMedia(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
        <CollectionMediaModal
          open={viewerIndex != null && mediaItems.length > 0}
          items={mediaItems}
          index={viewerIndex ?? 0}
          token={token}
          showActions
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
        />
        <IonAlert
          isOpen={editNameOpen}
          onDidDismiss={() => setEditNameOpen(false)}
          header="Редактировать фотосессию"
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Название фотосессии',
              value: collectionTitle === '—' ? '' : collectionTitle,
            },
          ]}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: submittingEditName ? '…' : 'Сохранить',
              handler: (data) => {
                const name = String(data?.name ?? '').trim();
                if (!name) {
                  toast.warning('Укажите название фотосессии');
                  return false;
                }
                void submitEditCollection(name);
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default CollectionViewPage;
