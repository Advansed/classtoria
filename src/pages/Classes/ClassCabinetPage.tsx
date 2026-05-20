import {
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
  heartOutline,
  peopleOutline,
  trophyOutline,
} from 'ionicons/icons';
import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from '../../Store';
import type { ClassRouteState } from './types';
import { useClassesStore } from './classesStore';
import './ClassCabinetPage.css';

const EVENT_IMG = '/images/start-gallery.png';
const FALLBACK_TEACHER_IMG = '/images/start-gallery.png';

const MOCK_STATS = [
  { label: 'События', value: 12 },
  { label: 'Фото', value: 486 },
  { label: 'Видео', value: 18 },
  { label: 'Сохранено фото', value: 164 },
  { label: 'Сохранено видео', value: 9 },
  { label: 'Комментарии', value: 47 },
] as const;

const eventPreview = (preview: string | undefined): string => {
  const src = preview?.trim();
  return src || EVENT_IMG;
};

const ClassCabinetPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation<ClassRouteState>();
  const state = location.state ?? {};
  const token = useStore((s) => s.token);

  const classId = state.classId?.trim() ?? '';
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
  const teacher = classDetail?.teacher;
  const teacherName = teacher?.name?.trim() || '—';
  const teacherImage = teacher?.image?.trim() || FALLBACK_TEACHER_IMG;
  const teacherAchievements = teacher?.achievements ?? 0;
  const teacherGratitudes = teacher?.gratitudes ?? 0;
  const events = classDetail?.events ?? [];

  return (
    <IonPage>
      <IonHeader className="class-cabinet__header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/personal/class"
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
            <div>
              <h1 className="class-cabinet__school">{schoolName}</h1>
              <p className="class-cabinet__class">{displayClassName}</p>
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
                <button type="button" className="class-cabinet__composition-card">
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
                  onClick={() =>
                    history.push('/class-cabinet/parents', {
                      schoolId,
                      schoolName,
                      classId,
                      className: displayClassName,
                    })
                  }
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
              {MOCK_STATS.map((item) => (
                <li key={item.label} className="class-cabinet__stat">
                  <span className="class-cabinet__stat-value">
                    {item.label === 'События' && events.length > 0 ? events.length : item.value}
                  </span>
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
                    <article key={`${ev.title}-${ev.date}-${index}`} className="class-cabinet__event-card">
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
                          <span className="class-cabinet__event-comments" aria-label={`${comments} материалов`}>
                            <IonIcon icon={chatbubbleOutline} aria-hidden />
                            {comments}
                          </span>
                        </div>
                        <p className="class-cabinet__event-meta">{ev.date}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <button type="button" className="class-cabinet__upload-btn">
            <IonIcon icon={cloudUploadOutline} className="class-cabinet__upload-icon" aria-hidden />
            <span>Загрузить событие / материалы</span>
            <IonIcon icon={chevronForwardOutline} className="class-cabinet__upload-chevron" aria-hidden />
          </button>

          <div className="class-cabinet__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassCabinetPage;
