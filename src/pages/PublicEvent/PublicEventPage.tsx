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
import { Camera, ChevronRight, Share2, User, Video } from 'lucide-react';
import { useHistory, useParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { collectionLabel } from '../Classes/components/collectionFormUtils';
import { buildEventShareUrl, publicCollectionPath } from '../Classes/routes';
import type { ClassCollection } from '../Classes/types';
import { useClassImageSrc } from '../Classes/components/useClassImageSrc';
import '../Classes/components/EventViewPage.css';
import { resolvePublicCollectionId, usePublicEvent } from './usePublicEvent';

const ICON_SIZE = 18;

const collectionThumbRaw = (col: ClassCollection): string => {
  const img = col.images[0];
  if (!img) {
    return '';
  }
  return img.preview.trim() || img.file.trim();
};

const photoCount = (collections: ClassCollection[]): number =>
  collections.reduce((sum, col) => sum + col.images.length, 0);

type CollectionRowProps = {
  collection: ClassCollection;
  authorFallback: string;
  onPress: () => void;
};

const CollectionRow: React.FC<CollectionRowProps> = ({
  collection,
  authorFallback,
  onPress,
}) => {
  const thumbSrc = useClassImageSrc(null, collectionThumbRaw(collection));
  const author = collection.creatorName?.trim() || authorFallback;

  return (
    <button type="button" className="event-view__collection-row" onClick={onPress}>
      <img src={thumbSrc} alt="" className="event-view__collection-thumb" loading="lazy" />
      <div className="event-view__collection-text">
        <p className="event-view__collection-title">{collectionLabel(collection)}</p>
        <p className="event-view__collection-author">{author}</p>
      </div>
      <ChevronRight size={20} className="event-view__collection-chevron" aria-hidden />
    </button>
  );
};

const PublicEventPage: React.FC = () => {
  const history = useHistory();
  const toast = useToast();
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = eventIdParam?.trim() ?? '';
  const { loading, error, data, event } = usePublicEvent(eventId);

  const contextLabel = [data?.schoolName, data?.className].filter(Boolean).join(' · ');
  const authorFallback = data?.className?.trim() || '—';
  const photoSessions = event?.collections.length ?? 0;
  const videos = event?.videoCount ?? 0;
  const comments = event?.comments ?? [];

  const copyEventLink = async () => {
    const id = event?.id?.trim() || eventId;
    if (!id) {
      toast.warning('У события нет id');
      return;
    }
    const url = buildEventShareUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Ссылка скопирована');
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const openCollection = (col: ClassCollection, index: number) => {
    const path = publicCollectionPath(eventId, resolvePublicCollectionId(col, index));
    if (path) {
      history.push(path);
    }
  };

  return (
    <IonPage>
      <IonHeader className="event-view__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/start" text="Назад" className="event-view__back" />
          </IonButtons>
          <IonTitle className="event-view__toolbar-title">Событие</IonTitle>
          <IonButtons slot="end">
            <button
              type="button"
              className="event-view__toolbar-auth"
              onClick={() => history.push('/auth')}
              aria-label="Войти"
            >
              <User size={20} aria-hidden />
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="event-view">
        <div className="event-view__scroll">
          {loading ? (
            <div className="event-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && error ? (
            <p className="event-view__error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && event ? (
            <>
              <article className="event-view__hero-card" aria-label={event.title}>
                <div className="event-view__hero-actions">
                  <button
                    type="button"
                    className="event-view__share-btn"
                    onClick={() => void copyEventLink()}
                    aria-label="Скопировать ссылку на событие"
                  >
                    <Share2 size={16} aria-hidden />
                  </button>
                </div>

                {contextLabel ? (
                  <p className="event-view__context">{contextLabel}</p>
                ) : null}
                <h1 className="event-view__title">{event.title}</h1>
                <p className="event-view__date">{event.date}</p>

                <ul className="event-view__stats">
                  <li className="event-view__stat">
                    <Camera size={ICON_SIZE} aria-hidden />
                    {photoSessions}{' '}
                    {photoSessions === 1
                      ? 'фотосессия'
                      : photoSessions >= 2 && photoSessions <= 4
                        ? 'фотосессии'
                        : 'фотосессий'}
                  </li>
                  <li className="event-view__stat">
                    <Video size={ICON_SIZE} aria-hidden />
                    {videos}{' '}
                    {videos === 1
                      ? 'видеоролик'
                      : videos >= 2 && videos <= 4
                        ? 'видеоролика'
                        : 'видеороликов'}
                  </li>
                  {photoCount(event.collections) > 0 ? (
                    <li className="event-view__stat">
                      <Camera size={ICON_SIZE} aria-hidden />
                      {photoCount(event.collections)} фото
                    </li>
                  ) : null}
                </ul>

                {event.description?.trim() ? (
                  <p className="event-view__description">{event.description.trim()}</p>
                ) : null}
              </article>

              <section className="event-view__section" aria-labelledby="public-event-sessions-heading">
                <h2 id="public-event-sessions-heading" className="event-view__section-head">
                  <Camera size={20} aria-hidden />
                  Фотосессии события
                </h2>

                <div className="event-view__collections-card">
                  {event.collections.length === 0 ? (
                    <p className="event-view__empty-collections">
                      Пока нет фотосессий.
                    </p>
                  ) : (
                    event.collections.map((col, index) => (
                      <CollectionRow
                        key={col.id ?? `${collectionLabel(col)}-${index}`}
                        collection={col}
                        authorFallback={authorFallback}
                        onPress={() => openCollection(col, index)}
                      />
                    ))
                  )}
                </div>
              </section>

              {comments.length > 0 ? (
                <section className="event-view__section" aria-labelledby="public-event-comments-heading">
                  <h2 id="public-event-comments-heading" className="event-view__section-head">
                    Комментарии события
                  </h2>
                  <div className="event-view__comments-card">
                    <ul className="event-view__comment-list">
                      {comments.map((comment) => (
                        <li key={comment.id} className="event-view__comment">
                          <div className="event-view__comment-body">
                            <p className="event-view__comment-meta">
                              <span className="event-view__comment-name">{comment.authorName}</span>
                              {comment.authorRole ? (
                                <>
                                  {' '}
                                  <span className="event-view__comment-role">
                                    {comment.authorRole}
                                  </span>
                                </>
                              ) : null}
                            </p>
                            <p className="event-view__comment-text">{comment.text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : null}

              <button
                type="button"
                className="event-view__upload-btn event-view__upload-btn--auth"
                onClick={() => history.push('/auth')}
              >
                <User size={ICON_SIZE} aria-hidden />
                Войти, чтобы загружать материалы
              </button>
            </>
          ) : null}

          <div className="event-view__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicEventPage;
