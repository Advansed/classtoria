import { IonContent, IonPage } from '@ionic/react';
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Image,
  Play,
  PlusCircle,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useChildAvatarUrl } from '../../../hooks/useChildAvatarUrl';
import { useAvatarDisplayUrl } from '../../../hooks/useAvatarDisplayUrl';
import { useClassImageSrc } from '../../Classes/components/useClassImageSrc';
import {
  favoriteEventPhotos,
  favoriteEventThumbRaw,
  summarizeFavorites,
} from '../../Classes/favoritesUtils';
import { CLASSES_EVENT_VIEW } from '../../Classes/routes';
import type { ClassEvent } from '../../Classes/types';
import { useStore, type UserClass } from '../../../Store';
import type { ChildRecord } from '../childrenTypes';
import { childRecordKey } from '../childrenUtils';
import './MyChildrenPage.css';

type HomeTab = 'events' | 'achievements' | 'capsule';

const parentInitial = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.charAt(0).toUpperCase();
};

const resolveClassContext = (
  child: ChildRecord,
  classes: UserClass[],
): { classLabel: string; schoolLabel: string; schoolId: string } => {
  const match = classes.find((cls) => cls.id === child.class_id);
  if (!match) {
    return { classLabel: child.class_id, schoolLabel: '', schoolId: '' };
  }
  return {
    classLabel: match.name.trim(),
    schoolLabel: match.schoolName.trim(),
    schoolId: match.schoolId,
  };
};

type ChildProfileCardProps = {
  child: ChildRecord;
  classLabel: string;
  schoolLabel: string;
  stats: { photos: number; videos: number; events: number };
};

const ChildProfileCard: React.FC<ChildProfileCardProps> = ({
  child,
  classLabel,
  schoolLabel,
  stats,
}) => {
  const avatarSrc = useChildAvatarUrl(child.image);
  const meta = [classLabel, schoolLabel].filter(Boolean).join(' · ');

  return (
    <div className="my-children__profile-card">
      <img src={avatarSrc} alt="" className="my-children__profile-photo" width={72} height={72} />
      <div className="my-children__profile-body">
        <p className="my-children__profile-name">{child.name.trim() || 'Имя не указано'}</p>
        {meta ? <p className="my-children__profile-meta">{meta}</p> : null}
      </div>
      <div className="my-children__stats" aria-label="Статистика">
        <div className="my-children__stat">
          <Image size={18} aria-hidden />
          <span>{stats.photos}</span>
        </div>
        <div className="my-children__stat">
          <Play size={18} aria-hidden />
          <span>{stats.videos}</span>
        </div>
        <div className="my-children__stat">
          <Calendar size={18} aria-hidden />
          <span>{stats.events}</span>
        </div>
        <div className="my-children__stat">
          <Trophy size={18} aria-hidden />
          <span>0</span>
        </div>
      </div>
    </div>
  );
};

type ChildEventRowProps = {
  event: ClassEvent;
  token: string | null;
  onPress: () => void;
};

const ChildEventRow: React.FC<ChildEventRowProps> = ({ event, token, onPress }) => {
  const thumbSrc = useClassImageSrc(token, favoriteEventThumbRaw(event));
  const photos = favoriteEventPhotos(event);

  return (
    <button type="button" className="my-children__event-row" onClick={onPress}>
      <img src={thumbSrc} alt="" className="my-children__event-thumb" loading="lazy" />
      <div className="my-children__event-body">
        <p className="my-children__event-title">{event.title}</p>
        <p className="my-children__event-meta">
          {[event.date, photos > 0 ? `${photos} фото` : ''].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ChevronRight size={20} className="my-children__event-chevron" aria-hidden />
    </button>
  );
};

const MyChildrenPage: React.FC = () => {
  const history = useHistory();
  const avatarSrc = useAvatarDisplayUrl();
  const profileName = useStore((s) => s.profile?.name ?? '');
  const childrens = useStore((s) => s.childrens);
  const favorites = useStore((s) => s.favorites);
  const classes = useStore((s) => s.classes);
  const loadClasses = useStore((s) => s.loadClasses);
  const token = useStore((s) => s.token);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTab>('events');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token?.trim() || classes.length > 0) {
      return;
    }
    void loadClasses();
  }, [token, classes.length, loadClasses]);

  const sortedChildren = useMemo(
    () =>
      [...childrens].sort((a, b) =>
        (a.name.trim() || a.phone).localeCompare(b.name.trim() || b.phone, 'ru'),
      ),
    [childrens],
  );

  const effectiveKey = selectedKey ?? (sortedChildren[0] ? childRecordKey(sortedChildren[0]) : null);

  const selectedChild = useMemo(
    () => sortedChildren.find((c) => childRecordKey(c) === effectiveKey) ?? sortedChildren[0] ?? null,
    [sortedChildren, effectiveKey],
  );

  const classContext = useMemo(
    () =>
      selectedChild
        ? resolveClassContext(selectedChild, classes)
        : { classLabel: '', schoolLabel: '', schoolId: '' },
    [selectedChild, classes],
  );

  const favoriteStats = useMemo(() => summarizeFavorites(favorites), [favorites]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [pickerOpen]);

  const selectChild = (child: ChildRecord) => {
    setSelectedKey(childRecordKey(child));
    setPickerOpen(false);
  };

  const openFavoriteEvent = (event: ClassEvent, index: number) => {
    if (!selectedChild) {
      return;
    }
    history.push(CLASSES_EVENT_VIEW, {
      schoolId: classContext.schoolId,
      schoolName: classContext.schoolLabel,
      classId: selectedChild.class_id,
      className: classContext.classLabel,
      eventId: event.id,
      eventIndex: index,
      eventTitle: event.title,
      eventDate: event.date,
    });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="my-children">
        <div className="my-children__scroll">
          <header className="my-children__header">
            <div>
              <p className="my-children__title">Мои дети</p>
              <p className="my-children__subtitle">
                выберите ребёнка, чтоб увидеть его историю
              </p>
            </div>
            <div className="my-children__header-actions">
              <button type="button" className="my-children__notify" aria-label="Уведомления">
                <Bell size={21} />
                <span className="my-children__notify-badge" aria-hidden>
                  3
                </span>
              </button>
              <button
                type="button"
                className="my-children__profile-btn"
                onClick={() => history.push('/personal/profile')}
                aria-label="Профиль"
              >
                <img src={avatarSrc} alt="" className="my-children__avatar" width={42} height={42} />
              </button>
              <button
                type="button"
                className="my-children__parent-badge"
                onClick={() => history.push('/personal/profile')}
                aria-label="Профиль родителя"
              >
                {parentInitial(profileName)}
                <ChevronDown size={14} aria-hidden />
              </button>
            </div>
          </header>

          <div
            ref={pickerRef}
            className={`my-children__picker${pickerOpen ? ' my-children__picker--open' : ''}`}
          >
            <button
              type="button"
              className="my-children__picker-btn"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen((open) => !open)}
            >
              <Users size={20} aria-hidden />
              <span className="my-children__picker-text">
                <span className="my-children__picker-label">Выберите ребёнка</span>
                <span className="my-children__picker-meta">Список детей: {sortedChildren.length}</span>
              </span>
              <ChevronDown size={20} className="my-children__picker-chevron" aria-hidden />
            </button>
            {pickerOpen ? (
              <ul className="my-children__picker-list" role="listbox" aria-label="Дети">
                {sortedChildren.map((child) => {
                  const key = childRecordKey(child);
                  const isSelected = key === effectiveKey;
                  const { classLabel, schoolLabel } = resolveClassContext(child, classes);
                  return (
                    <li key={key} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`my-children__picker-item${isSelected ? ' my-children__picker-item--selected' : ''}`}
                        onClick={() => selectChild(child)}
                      >
                        <span className="my-children__picker-item-name">
                          {child.name.trim() || child.phone}
                        </span>
                        <span className="my-children__picker-item-meta">
                          {[classLabel, schoolLabel].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li role="none">
                  <button
                    type="button"
                    className="my-children__picker-add"
                    onClick={() => {
                      setPickerOpen(false);
                      history.push('/personal/child-add');
                    }}
                  >
                    <PlusCircle size={18} aria-hidden />
                    Добавить ребёнка
                  </button>
                </li>
              </ul>
            ) : null}
          </div>

          {selectedChild ? (
            <ChildProfileCard
              child={selectedChild}
              classLabel={classContext.classLabel}
              schoolLabel={classContext.schoolLabel}
              stats={favoriteStats}
            />
          ) : null}

          <div className="my-children__tabs" role="tablist" aria-label="Разделы ребёнка">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'events'}
              className={`my-children__tab${activeTab === 'events' ? ' my-children__tab--active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              События{favorites.length > 0 ? ` (${favorites.length})` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'achievements'}
              className={`my-children__tab${activeTab === 'achievements' ? ' my-children__tab--active' : ''}`}
              onClick={() => setActiveTab('achievements')}
            >
              Достижения
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'capsule'}
              className={`my-children__tab${activeTab === 'capsule' ? ' my-children__tab--active' : ''}`}
              onClick={() => setActiveTab('capsule')}
            >
              Капсула
            </button>
          </div>

          {activeTab === 'events' ? (
            <section className="my-children__events" aria-label="События">
              <div className="my-children__year-head">
                <p className="my-children__year-title">
                  {classContext.classLabel
                    ? `2025–2026 · ${classContext.classLabel}`
                    : '2025–2026'}
                </p>
                {favorites.length > 0 ? (
                  <div className="my-children__year-badges">
                    <span className="my-children__badge my-children__badge--orange">
                      {favoriteStats.photos} фото
                    </span>
                  </div>
                ) : (
                  <div className="my-children__year-badges">
                    <span className="my-children__badge my-children__badge--green">текущий год</span>
                  </div>
                )}
              </div>

              {favorites.length === 0 ? (
                <p className="my-children__events-empty">
                  Пока нет избранных событий. Отметьте понравившиеся фото в кабинете класса.
                </p>
              ) : (
                <ul className="my-children__event-list">
                  {favorites.map((event, index) => (
                    <li key={event.id ?? `${event.title}-${event.date}-${index}`}>
                      <ChildEventRow
                        event={event}
                        token={token}
                        onPress={() => openFavoriteEvent(event, index)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <p className="my-children__placeholder">
              {activeTab === 'achievements'
                ? 'Достижения ребёнка появятся здесь.'
                : 'Капсула времени скоро будет доступна.'}
            </p>
          )}

          <div className="my-children__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MyChildrenPage;
