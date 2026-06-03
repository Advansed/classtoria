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
import { Calendar, Crown, MessageCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { collectionLabel } from '../Classes/components/collectionFormUtils';
import {
  formatEventMetaLine,
  imageStatsLabel,
  imageThumbRaw,
} from '../Classes/components/classViewUtils';
import { useClassImageSrc } from '../Classes/components/useClassImageSrc';
import '../Classes/components/CollectionViewPage.css';
import {
  publicEventPath,
  publicImagePath,
} from '../Classes/routes';
import type { ClassImage } from '../Classes/types';
import {
  findPublicCollection,
  resolvePublicImageId,
  usePublicEvent,
} from './usePublicEvent';

const ICON_SIZE = 20;

type PhotoTileProps = {
  image: ClassImage;
  onOpen: () => void;
};

const PhotoTile: React.FC<PhotoTileProps> = ({ image, onOpen }) => {
  const src = useClassImageSrc(null, imageThumbRaw(image));

  return (
    <button type="button" className="collection-view__photo-btn" onClick={onOpen}>
      <img src={src} alt="" loading="lazy" />
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
  const history = useHistory();
  const { eventId: eventIdParam, collectionId: collectionIdParam } = useParams<{
    eventId: string;
    collectionId: string;
  }>();
  const eventId = eventIdParam?.trim() ?? '';
  const collectionId = collectionIdParam?.trim() ?? '';
  const { loading, error, data, event } = usePublicEvent(eventId);

  const collection = useMemo(
    () => findPublicCollection(event, collectionId),
    [event, collectionId],
  );

  const schoolName = data?.schoolName?.trim() || '';
  const className = data?.className?.trim() || '—';
  const collectionTitle = collection ? collectionLabel(collection) : '—';
  const photos = useMemo(
    () => collection?.images.filter((img) => imageThumbRaw(img)) ?? [],
    [collection?.images],
  );

  const videoPlayRaw = collection?.videoUrl?.trim() || collection?.videoPreview?.trim() || '';
  const videoPosterRaw = collection?.videoPreview?.trim() || collection?.videoUrl?.trim() || '';
  const videoPlaySrc = useClassImageSrc(null, videoPlayRaw);
  const videoPosterSrc = useClassImageSrc(null, videoPosterRaw);

  const openImage = (image: ClassImage, index: number) => {
    const path = publicImagePath(
      eventId,
      collectionId,
      resolvePublicImageId(image, index),
    );
    if (path) {
      history.push(path);
    }
  };

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

              {videoPlayRaw ? (
                <div className="collection-view__video-wrap">
                  <video
                    className="collection-view__video-player"
                    controls
                    playsInline
                    preload="metadata"
                    poster={videoPosterSrc}
                    src={videoPlaySrc}
                  />
                  {collection.videoDuration?.trim() ? (
                    <span className="collection-view__video-duration">
                      {collection.videoDuration.trim()}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {photos.length === 0 ? (
                <p className="collection-view__empty">В этой фотосессии пока нет фотографий.</p>
              ) : (
                <div className="collection-view__grid">
                  {photos.map((img, index) => (
                    <PhotoTile
                      key={img.imageId ?? `photo-${index}-${imageThumbRaw(img)}`}
                      image={img}
                      onOpen={() => openImage(img, index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicCollectionPage;
