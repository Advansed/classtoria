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
import {
  Camera,
  ChevronRight,
  Send,
  Share2,
  Upload,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { useClassesStore } from '../classesStore';
import { CLASSES_CABINET, CLASSES_COLLECTION_UPLOAD, CLASSES_COLLECTION_VIEW } from '../routes';
import type {
  ClassCollection,
  ClassEvent,
  CollectionUploadRouteState,
  CollectionViewRouteState,
  EventViewRouteState,
} from '../types';
import { resolveWhitelistTeacher, filterTeachers } from '../utils';
import { useClassImageSrc } from './useClassImageSrc';
import './EventViewPage.css';

const FALLBACK_AVATAR = '/images/auth-feature.png';
const ICON_SIZE = 18;

const collectionLabel = (col: ClassCollection): string =>
  col.title.trim() || col.name.trim() || 'Коллекция';

const collectionThumbRaw = (col: ClassCollection): string => {
  const img = col.images[0];
  if (!img) {
    return '';
  }
  return img.preview.trim() || img.file.trim();
};

const photoCount = (event: ClassEvent): number =>
  event.collections.reduce((sum, col) => sum + col.images.length, 0);

const findEvent = (
  events: ClassEvent[],
  eventId: string,
  eventIndex: number | undefined,
): ClassEvent | undefined => {
  if (eventId) {
    const byId = events.find((ev) => ev.id === eventId);
    if (byId) {
      return byId;
    }
  }
  if (eventIndex != null && eventIndex >= 0 && eventIndex < events.length) {
    return events[eventIndex];
  }
  return undefined;
};

type CollectionRowProps = {
  collection: ClassCollection;
  authorFallback: string;
  token: string | null;
  onPress: () => void;
};

const CollectionRow: React.FC<CollectionRowProps> = ({
  collection,
  authorFallback,
  token,
  onPress,
}) => {
  const thumbSrc = useClassImageSrc(token, collectionThumbRaw(collection));
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

const EventViewPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<EventViewRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const userId = useStore((s) => s.user_id);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute = state.className?.trim() || '';
  const eventId = state.eventId?.trim() || '';
  const eventIndex = state.eventIndex;

  const loadClass = useClassesStore((s) => s.loadClass);
  const loading = useClassesStore((s) => s.loading);
  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));

  const [commentDraft, setCommentDraft] = useState('');

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
  const events = classDetail?.events ?? [];
  const event = useMemo(
    () => findEvent(events, eventId, eventIndex),
    [events, eventId, eventIndex],
  );

  const members = classDetail?.members ?? [];
  const teacherMembers = useMemo(() => filterTeachers(members), [members]);
  const teacherCard = useMemo(
    () => resolveWhitelistTeacher(classDetail?.teacher, teacherMembers, members),
    [classDetail?.teacher, teacherMembers, members],
  );
  const authorFallback = teacherCard.name || '—';
  const canEdit = Boolean(event?.creator?.trim() && event.creator.trim() === userId.trim());

  const photoSessions = event?.collections.length ?? 0;
  const videos = event?.videoCount ?? 0;
  const comments = event?.comments ?? [];

  const openUpload = () => {
    if (!canEdit) {
      toast.warning('Событие доступно только для просмотра');
      return;
    }
    if (!event) {
      return;
    }
    if (!event.id?.trim()) {
      toast.warning('У события нет id — обновите данные класса или создайте событие заново');
      return;
    }

    const uploadState: CollectionUploadRouteState = {
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
      eventTitle: event.title,
      eventDate: event.date,
      eventDescription: event.description ?? '',
      eventId: event.id,
    };
    history.push(CLASSES_COLLECTION_UPLOAD, uploadState);
  };

  const shareEvent = async () => {
    if (!event) {
      return;
    }
    const text = [event.title, event.date, event.description].filter(Boolean).join('\n');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: event.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('Описание события скопировано');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      toast.error('Не удалось поделиться событием');
    }
  };

  const sendComment = () => {
    if (!canEdit) {
      toast.warning('Комментарии доступны только владельцу класса');
      return;
    }
    const text = commentDraft.trim();
    if (!text) {
      return;
    }
    toast.show('Отправка комментариев скоро будет доступна');
    setCommentDraft('');
  };

  const openCollection = (col: ClassCollection, index: number) => {
    if (!event) {
      return;
    }
    const nextState: CollectionViewRouteState = {
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
      eventId: event.id,
      eventIndex,
      eventTitle: event.title,
      eventDate: event.date,
      ...(col.id ? { collectionId: col.id } : {}),
      collectionIndex: index,
    };
    history.push(CLASSES_COLLECTION_VIEW, nextState);
  };

  return (
    <IonPage>
      <IonHeader className="event-view__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={CLASSES_CABINET}
              text="Назад"
              className="event-view__back"
            />
          </IonButtons>
          <IonTitle className="event-view__toolbar-title">Событие</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="event-view">
        <div className="event-view__scroll">
          {loading && !classDetail ? (
            <div className="event-view__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка…</p>
            </div>
          ) : null}

          {!loading && !event ? (
            <p className="event-view__error" role="alert">
              Событие не найдено. Вернитесь в ЛК класса и откройте событие снова.
            </p>
          ) : null}

          {event ? (
            <>
              <article className="event-view__hero-card" aria-label={event.title}>
                <button
                  type="button"
                  className="event-view__share-btn"
                  onClick={() => void shareEvent()}
                >
                  <Share2 size={16} aria-hidden />
                  Поделиться событием
                </button>

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
                  {photoCount(event) > 0 ? (
                    <li className="event-view__stat">
                      <Camera size={ICON_SIZE} aria-hidden />
                      {photoCount(event)} фото
                    </li>
                  ) : null}
                </ul>

                {event.description?.trim() ? (
                  <p className="event-view__description">{event.description.trim()}</p>
                ) : null}
              </article>

              <section className="event-view__section" aria-labelledby="event-view-sessions-heading">
                <h2 id="event-view-sessions-heading" className="event-view__section-head">
                  <Camera size={20} aria-hidden />
                  Фотосессии события
                </h2>

                <div className="event-view__collections-card">
                  {event.collections.length === 0 ? (
                    <p className="event-view__empty-collections">
                      Пока нет фотосессий. Загрузите материалы события.
                    </p>
                  ) : (
                    event.collections.map((col, index) => (
                      <CollectionRow
                        key={col.id ?? `${collectionLabel(col)}-${index}`}
                        collection={col}
                        authorFallback={authorFallback}
                        token={token}
                        onPress={() => openCollection(col, index)}
                      />
                    ))
                  )}
                </div>
              </section>

              <button
                type="button"
                className="event-view__upload-btn"
                onClick={openUpload}
                disabled={!canEdit}
              >
                <Upload size={ICON_SIZE} aria-hidden />
                Загрузить материалы события
              </button>

              <section className="event-view__section" aria-labelledby="event-view-comments-heading">
                <h2 id="event-view-comments-heading" className="event-view__section-head">
                  Комментарии события
                </h2>

                <div className="event-view__comments-card">
                  {comments.length === 0 ? (
                    <p className="event-view__comments-empty">Комментариев пока нет</p>
                  ) : (
                    <ul className="event-view__comment-list">
                      {comments.map((comment) => (
                        <li key={comment.id} className="event-view__comment">
                          <img
                            src={comment.avatar?.trim() || FALLBACK_AVATAR}
                            alt=""
                            className="event-view__comment-avatar"
                            loading="lazy"
                          />
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
                  )}

                  <form
                    className="event-view__comment-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendComment();
                    }}
                  >
                    <input
                      type="text"
                      className="event-view__comment-input"
                      placeholder={canEdit ? 'Написать комментарий' : 'Только просмотр'}
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      aria-label="Написать комментарий"
                      readOnly={!canEdit}
                    />
                    <button
                      type="submit"
                      className="event-view__comment-send"
                      disabled={!canEdit || !commentDraft.trim()}
                      aria-label="Отправить"
                    >
                      <Send size={18} aria-hidden />
                    </button>
                  </form>
                </div>
              </section>
            </>
          ) : null}

          <div className="event-view__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EventViewPage;
