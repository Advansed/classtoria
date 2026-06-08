import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { Calendar, Crown, MessageCircle, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collectionLabel } from '../Classes/components/collectionFormUtils';
import {
  collectionMediaItems,
  formatEventMetaLine,
  imageStatsLabel,
  imageThumbRaw,
  isCollectionVideo,
} from '../Classes/components/classViewUtils';
import CollectionMediaModal from '../Classes/components/CollectionMediaModal';
import { useClassImageSrc } from '../Classes/components/useClassImageSrc';
import '../Classes/components/CollectionViewPage.css';
import { publicEventPath } from '../Classes/routes';
import type { ClassImage } from '../Classes/types';
import { findPublicCollection, usePublicEvent } from './usePublicEvent';

const ICON_SIZE = 20;

type PhotoTileProps = {
  image: ClassImage;
  onOpen: () => void;
};

const PhotoTile: React.FC<PhotoTileProps> = ({ image, onOpen }) => {
  const src = useClassImageSrc(null, imageThumbRaw(image));
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

const PublicCollectionPage: React.FC = () => {
  const { eventId: eventIdParam, collectionId: collectionIdParam } = useParams<{
    eventId: string;
    collectionId: string;
  }>();
  const eventId = eventIdParam?.trim() ?? '';
  const collectionId = collectionIdParam?.trim() ?? '';
  const { loading, error, data, event } = usePublicEvent(eventId);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const collection = useMemo(
    () => findPublicCollection(event, collectionId),
    [event, collectionId],
  );

  const schoolName = data?.schoolName?.trim() || '';
  const className = data?.className?.trim() || '—';
  const collectionTitle = collection ? collectionLabel(collection) : '—';
  const mediaItems = useMemo(
    () =>
      collectionMediaItems(collection).filter((img) => imageThumbRaw(img)),
    [collection],
  );

  return (
    <IonPage>
      <IonHeader className="collection-view__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={publicEventPath(eventId) || '/start'}
              text="Назад"
              className="collection-view__back"
            />
          </IonButtons>
          <IonTitle className="collection-view__toolbar-title">Фотосессия</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="collection-view">
        <div className="collection-view__scroll">
          {loading ? (
            <div className="collection-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && (error || !collection) ? (
            <p className="collection-view__error" role="alert">
              {error || 'Фотосессия не найдена.'}
            </p>
          ) : null}

          {!loading && collection ? (
            <>
              <article className="collection-view__event-card">
                <Calendar size={ICON_SIZE} className="collection-view__event-icon" aria-hidden />
                <div>
                  <p className="collection-view__event-label">Событие</p>
                  <h1 className="collection-view__event-title">{event?.title ?? '—'}</h1>
                  <p className="collection-view__event-meta">
                    {formatEventMetaLine(event?.date ?? '', schoolName, className)}
                  </p>
                </div>
              </article>

              <h2 className="collection-view__collection-title">{collectionTitle}</h2>

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
                      onOpen={() => setViewerIndex(index)}
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
          token={null}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
        />
      </IonContent>
    </IonPage>
  );
};

export default PublicCollectionPage;
