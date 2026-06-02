import {
  IonAlert,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  calendarOutline,
  chatbubbleOutline,
  chevronForwardOutline,
  cloudUploadOutline,
  createOutline,
  heartOutline,
  peopleOutline,
  trophyOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';
import { useStore } from '../../../Store';
import { editClass, editEvent } from '../classesApi';
import type { ClassEvent, ClassRouteState } from '../types';
import { useClassesStore } from '../classesStore';
import { CLASSES_BASE, CLASSES_EVENT_VIEW, CLASSES_UPLOAD, CLASSES_WHITELIST } from '../routes';
import { filterTeachers, formatPhoneDisplay, resolveWhitelistTeacher } from '../utils';
import { toDisplayDate, toInputDate } from './eventFormUtils';
import './ClassCabinetPage.css';

const EVENT_IMG = '/images/start-gallery.png';
const FALLBACK_TEACHER_IMG = '/images/start-gallery.png';

const CLASS_STAT_ITEMS = [
  { key: 'events', label: 'События' },
  { key: 'collections', label: 'Коллекции' },
  { key: 'photos', label: 'Фото' },
  { key: 'comments', label: 'Комментарии' },
] as const;

const eventPreview = (preview: string | undefined): string => {
  const src = preview?.trim();
  return src || EVENT_IMG;
};

const ClassCabinetPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ClassRouteState>();
  const toast = useToast();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);
  const [editEventTarget, setEditEventTarget] = useState<ClassEvent | null>(null);
  const [submittingEditEvent, setSubmittingEditEvent] = useState(false);
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [submittingEditClass, setSubmittingEditClass] = useState(false);

  const activeClassId = useClassesStore((s) => s.activeClassId);
  const classId = state.classId?.trim() || activeClassId?.trim() || '';
  const schoolId = state.schoolId?.trim();
  const schoolName = state.schoolName?.trim() || 'СОШ №17';
  const classNameFromRoute = state.className?.trim() || '';

  const loadClass = useClassesStore((s) => s.loadClass);
  const loading = useClassesStore((s) => s.loading);
  const error = useClassesStore((s) => s.error);
  const classDetail = useClassesStore((s) => (classId ? s.getClassById(classId) : undefined));
  const studentCount = useClassesStore((s) =>
    classId ? s.getMemberCounts(classId).studentCount : 0,
  );
  const parentCount = useClassesStore((s) =>
    classId ? s.getMemberCounts(classId).parentCount : 0,
  );

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
  const members = classDetail?.members;
  const teacherMembers = useMemo(() => filterTeachers(members ?? []), [members]);
  const teacherCard = useMemo(
    () => resolveWhitelistTeacher(classDetail?.teacher, teacherMembers, members),
    [classDetail?.teacher, teacherMembers, members],
  );
  const teacherName = teacherCard.name || '—';
  const teacherPhone = formatPhoneDisplay(teacherCard.phone);
  const teacherImage = teacherCard.image?.trim() || FALLBACK_TEACHER_IMG;
  const teacherAchievements = classDetail?.teacher?.achievements ?? 0;
  const teacherGratitudes = classDetail?.teacher?.gratitudes ?? 0;
  const events = classDetail?.events ?? [];
  const stats = classDetail?.stats;

  const submitEditEvent = async (eventId: string, name: string, date: string) => {
    const trimmedToken = token?.trim() ?? '';
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!name) {
      toast.warning('Укажите название события');
      return;
    }
    if (!date) {
      toast.warning('Укажите дату события');
      return;
    }

    setSubmittingEditEvent(true);
    try {
      const res = await editEvent({ token: trimmedToken, eventId, name, date });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось изменить название события');
        return;
      }
      toast.success(res.message?.trim() || 'Название события обновлено');
      setEditEventTarget(null);
      if (classId && trimmedToken) {
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
      setSubmittingEditEvent(false);
    }
  };

  const submitEditClass = async (nextName: string) => {
    const trimmedToken = token?.trim() ?? '';
    const trimmedClassId = classId.trim();
    if (!trimmedToken) {
      toast.warning('Войдите в аккаунт');
      return;
    }
    if (!trimmedClassId) {
      toast.warning('У класса нет id');
      return;
    }
    if (!nextName) {
      toast.warning('Укажите название класса');
      return;
    }

    setSubmittingEditClass(true);
    try {
      const res = await editClass({ token: trimmedToken, classId: trimmedClassId, name: nextName });
      if (!res.success) {
        toast.error(res.message?.trim() || 'Не удалось изменить название класса');
        return;
      }
      toast.success(res.message?.trim() || 'Название класса обновлено');
      setEditClassOpen(false);
      await loadClass({
        classId: trimmedClassId,
        schoolId,
        token: trimmedToken,
        name: nextName,
      });
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setSubmittingEditClass(false);
    }
  };

  const openWhitelist = () => {
    history.push(CLASSES_WHITELIST, {
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
    });
  };

  const openUpload = () => {
    history.push(CLASSES_UPLOAD, {
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
    });
  };

  const openEvent = (ev: (typeof events)[number], index: number) => {
    history.push(CLASSES_EVENT_VIEW, {
      schoolId,
      schoolName,
      classId,
      className: displayClassName,
      eventId: ev.id,
      eventIndex: index,
      ...((ev.creatorId ?? ev.creator)?.trim()
        ? { eventCreatorId: (ev.creatorId ?? ev.creator)!.trim() }
        : {}),
    });
  };

  return (
    <IonPage>
      <IonHeader className="class-cabinet__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={CLASSES_BASE}
              text="Назад"
              className="class-cabinet__back"
            />
          </IonButtons>
          <IonTitle className="class-cabinet__toolbar-title">ЛК класса</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="class-cabinet">
        <div className="class-cabinet__scroll">
          <div className="class-cabinet__top">
            <div className="class-cabinet__title-row">
              <h1 className="class-cabinet__school">{schoolName}</h1>
              <div className="class-cabinet__class-row">
                <p className="class-cabinet__class">{displayClassName}</p>
                {classId ? (
                  <button
                    type="button"
                    className="class-cabinet__class-edit"
                    aria-label={`Редактировать класс «${displayClassName}»`}
                    disabled={submittingEditClass}
                    onClick={() => setEditClassOpen(true)}
                  >
                    <IonIcon icon={createOutline} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
            <IonSelect
              interface="popover"
              className="class-cabinet__year-select"
              value="2025-2026"
              aria-label="Учебный год"
            >
              <IonSelectOption value="2025-2026">2025–2026</IonSelectOption>
              <IonSelectOption value="2024-2025">2024–2025</IonSelectOption>
            </IonSelect>
          </div>

          {loading && !classDetail ? (
            <div className="class-cabinet__loading" role="status">
              <IonSpinner name="crescent" />
              <p>Загрузка класса…</p>
            </div>
          ) : null}

          {error && !classDetail ? (
            <p className="class-cabinet__error" role="alert">
              {error}
            </p>
          ) : null}

          <section className="class-cabinet__card class-cabinet__hero" aria-label="Классный руководитель">
            <div className="class-cabinet__hero-row">
              <div className="class-cabinet__teacher">
                <img
                  src={teacherImage}
                  alt=""
                  className="class-cabinet__teacher-avatar"
                  width={56}
                  height={56}
                />
                <div className="class-cabinet__teacher-info">
                  <p className="class-cabinet__teacher-label">Классный руководитель</p>
                  <p className="class-cabinet__teacher-name">{teacherName}</p>
                  <p className="class-cabinet__teacher-phone">
                    {teacherPhone || 'Телефон не указан'}
                  </p>
                  {teacherAchievements > 0 ? (
                    <p className="class-cabinet__teacher-stat">
                      <IonIcon icon={trophyOutline} aria-hidden />
                      Достижения учителя: {teacherAchievements}
                    </p>
                  ) : null}
                  {teacherGratitudes > 0 ? (
                    <p className="class-cabinet__teacher-stat">
                      <IonIcon icon={heartOutline} aria-hidden />
                      Благодарности: {teacherGratitudes}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="class-cabinet__composition">
                <button type="button" className="class-cabinet__composition-card" onClick={openWhitelist}>
                  <span className="class-cabinet__composition-icon" aria-hidden>
                    <IonIcon icon={peopleOutline} />
                  </span>
                  <span className="class-cabinet__composition-text">
                    <span className="class-cabinet__composition-value">{studentCount}</span>
                    <span className="class-cabinet__composition-label">учеников</span>
                  </span>
                  <IonIcon icon={chevronForwardOutline} className="class-cabinet__composition-chevron" aria-hidden />
                </button>
                <button
                  type="button"
                  className="class-cabinet__composition-card"
                  onClick={openWhitelist}
                >
                  <span className="class-cabinet__composition-icon" aria-hidden>
                    <IonIcon icon={peopleOutline} />
                  </span>
                  <span className="class-cabinet__composition-text">
                    <span className="class-cabinet__composition-value">{parentCount}</span>
                    <span className="class-cabinet__composition-label">родителей</span>
                  </span>
                  <IonIcon icon={chevronForwardOutline} className="class-cabinet__composition-chevron" aria-hidden />
                </button>
              </div>
            </div>
          </section>

          <section className="class-cabinet__card class-cabinet__stats" aria-label="Статистика класса">
            <ul className="class-cabinet__stats-grid">
              {CLASS_STAT_ITEMS.map((item) => (
                <li key={item.key} className="class-cabinet__stat">
                  <span className="class-cabinet__stat-value">{stats?.[item.key] ?? 0}</span>
                  <span className="class-cabinet__stat-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="class-cabinet__section" aria-labelledby="class-cabinet-history-heading">
            <h2 id="class-cabinet-history-heading" className="class-cabinet__h2">
              История класса
            </h2>
            <button type="button" className="class-cabinet__history-btn" aria-label="История класса">
              <IonIcon icon={calendarOutline} aria-hidden />
            </button>
          </section>

          <section className="class-cabinet__section" aria-labelledby="class-cabinet-events-heading">
            <h2 id="class-cabinet-events-heading" className="class-cabinet__h2">
              События класса
            </h2>
            {events.length === 0 ? (
              <p className="class-cabinet__empty-events">Событий пока нет</p>
            ) : (
              <div className="class-cabinet__event-grid">
                {events.map((ev, index) => {
                  const preview =
                    ev.collections[0]?.images[0]?.preview ||
                    ev.collections[0]?.images[0]?.file;
                  const comments = ev.collections.reduce(
                    (sum, col) => sum + col.images.length,
                    0,
                  );

                  return (
                    <button
                      type="button"
                      key={`${ev.id ?? ev.title}-${ev.date}-${index}`}
                      className="class-cabinet__event-card"
                      onClick={() => openEvent(ev, index)}
                    >
                      <div className="class-cabinet__event-img-wrap">
                        <img
                          src={eventPreview(preview)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="class-cabinet__event-body">
                        <div className="class-cabinet__event-title-row">
                          <h3 className="class-cabinet__event-title">{ev.title}</h3>
                          <div className="class-cabinet__event-title-actions">
                            {ev.id?.trim() ? (
                              <button
                                type="button"
                                className="class-cabinet__event-edit"
                                aria-label={`Редактировать событие «${ev.title}»`}
                                disabled={submittingEditEvent}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditEventTarget(ev);
                                }}
                              >
                                <IonIcon icon={createOutline} aria-hidden />
                              </button>
                            ) : null}
                            <span className="class-cabinet__event-comments" aria-label={`${comments} материалов`}>
                              <IonIcon icon={chatbubbleOutline} aria-hidden />
                              {comments}
                            </span>
                          </div>
                        </div>
                        <p className="class-cabinet__event-meta">{ev.date}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <button type="button" className="class-cabinet__upload-btn" onClick={openUpload}>
            <IonIcon icon={cloudUploadOutline} className="class-cabinet__upload-icon" aria-hidden />
            <span>Загрузить событие / материалы</span>
            <IonIcon icon={chevronForwardOutline} className="class-cabinet__upload-chevron" aria-hidden />
          </button>

          <div className="class-cabinet__bottom-spacer" aria-hidden />
        </div>

        <IonAlert
          isOpen={editClassOpen}
          onDidDismiss={() => setEditClassOpen(false)}
          header="Редактировать класс"
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Название класса',
              value: displayClassName === '—' ? '' : displayClassName,
            },
          ]}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: submittingEditClass ? '…' : 'Сохранить',
              handler: (data) => {
                const name = String(data?.name ?? '').trim();
                if (!name) {
                  toast.warning('Укажите название класса');
                  return false;
                }
                void submitEditClass(name);
              },
            },
          ]}
        />

        <IonAlert
          isOpen={editEventTarget != null}
          onDidDismiss={() => setEditEventTarget(null)}
          header="Редактировать событие"
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Название события',
              value: editEventTarget?.title ?? '',
            },
            {
              name: 'date',
              type: 'date',
              value: toInputDate(editEventTarget?.date ?? ''),
            },
          ]}
          buttons={[
            { text: 'Отмена', role: 'cancel' },
            {
              text: submittingEditEvent ? '…' : 'Сохранить',
              handler: (data) => {
                const target = editEventTarget;
                const eventId = target?.id?.trim() ?? '';
                if (!target || !eventId) {
                  toast.warning('У события нет id');
                  return false;
                }
                const name = String(data?.name ?? '').trim();
                const dateIso = String(data?.date ?? '').trim();
                const date = dateIso ? toDisplayDate(dateIso) : target.date.trim();
                if (!name) {
                  toast.warning('Укажите название события');
                  return false;
                }
                if (!date) {
                  toast.warning('Укажите дату события');
                  return false;
                }
                void submitEditEvent(eventId, name, date);
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassCabinetPage;
