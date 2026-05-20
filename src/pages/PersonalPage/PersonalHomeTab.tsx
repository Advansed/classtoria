import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import {
  calendarOutline,
  chatbubbleOutline,
  chevronForwardOutline,
  addOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { useAvatarDisplayUrl } from '../../hooks/useAvatarDisplayUrl';
import { useStore } from '../../Store';
import './PersonalHomeTab.css';

const EVENT_IMG = '/images/start-gallery.png';

const MOCK_CHILDREN = [
  {
    id: '1',
    name: 'София Иванова',
    classLabel: '7Б класс',
    school: 'СОШ №17',
  },
];

const MOCK_EVENTS = [
  { id: '1', title: 'Линейка 1 сентября', date: '01.09.2025', classLabel: '7Б класс', comments: 12 },
  { id: '2', title: 'День знаний', date: '02.09.2025', classLabel: '7Б класс', comments: 8 },
  { id: '3', title: 'Экскурсия в музей', date: '15.09.2025', classLabel: '7Б класс', comments: 5 },
  { id: '4', title: 'Спортивный день', date: '20.09.2025', classLabel: '7Б класс', comments: 15 },
];

const PersonalHomeTab: React.FC = () => {
  const profile = useStore((s) => s.profile);
  const avatarSrc = useAvatarDisplayUrl();
  const displayName = profile?.name?.trim() || '—';

  return (
    <IonPage>
      <IonContent fullscreen className="personal-home">
        <div className="personal-home__scroll">
          <header className="personal-home__profile-card">
            <div className="personal-home__user">
              <div className="personal-home__avatar-wrap">
                <img
                  key={avatarSrc}
                  src={avatarSrc}
                  alt=""
                  className="personal-home__avatar"
                  width={52}
                  height={52}
                />
              </div>
              <p className="personal-home__name">{displayName}</p>
            </div>
            <button
              type="button"
              className="personal-home__notify"
              aria-label="Уведомления, непрочитано: 4"
            >
              <span className="personal-home__notify-icon-wrap" aria-hidden>
                <IonIcon icon={notificationsOutline} className="personal-home__notify-icon" />
                <IonBadge color="danger" className="personal-home__notify-badge">
                  4
                </IonBadge>
              </span>
              <span className="personal-home__notify-text">Уведомления</span>
            </button>
          </header>

          <section className="personal-home__section" aria-labelledby="personal-children-heading">
            <div className="personal-home__section-head">
              <h2 id="personal-children-heading" className="personal-home__h2">
                Мои дети
              </h2>
              <IonSelect
                interface="popover"
                className="personal-home__year-select"
                value="2025-2026"
                aria-label="Учебный год"
              >
                <IonSelectOption value="2025-2026">2025–2026</IonSelectOption>
                <IonSelectOption value="2024-2025">2024–2025</IonSelectOption>
              </IonSelect>
            </div>

            <div className="personal-home__children-grid">
              {MOCK_CHILDREN.map((c) => (
                <article key={c.id} className="personal-home__child-card">
                  <div className="personal-home__child-top">
                    <img
                      src={EVENT_IMG}
                      alt=""
                      className="personal-home__child-avatar"
                      width={40}
                      height={40}
                    />
                    <div className="personal-home__child-info">
                      <p className="personal-home__child-name">{c.name}</p>
                      <p className="personal-home__child-meta">{c.classLabel}</p>
                      <p className="personal-home__child-meta">{c.school}</p>
                    </div>
                  </div>
                  <IonButton expand="block" className="personal-home__child-btn">
                    Перейти в ЛК класса
                    <IonIcon slot="end" icon={chevronForwardOutline} aria-hidden />
                  </IonButton>
                </article>
              ))}
              <button type="button" className="personal-home__add-child">
                <IonIcon icon={addOutline} className="personal-home__add-icon" aria-hidden />
                <span>Добавить ребёнка</span>
              </button>
            </div>
          </section>

          <section className="personal-home__section" aria-labelledby="personal-events-heading">
            <div className="personal-home__events-head">
              <span className="personal-home__events-icon" aria-hidden>
                <IonIcon icon={calendarOutline} />
              </span>
              <h2 id="personal-events-heading" className="personal-home__h2">
                События классов
              </h2>
            </div>
            <div className="personal-home__event-grid">
              {MOCK_EVENTS.map((ev) => (
                <article key={ev.id} className="personal-home__event-card">
                  <div className="personal-home__event-img-wrap">
                    <img src={EVENT_IMG} alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="personal-home__event-body">
                    <div className="personal-home__event-title-row">
                      <h3 className="personal-home__event-title">{ev.title}</h3>
                      <span className="personal-home__event-comments" aria-label={`${ev.comments} комментариев`}>
                        <IonIcon icon={chatbubbleOutline} aria-hidden />
                        {ev.comments}
                      </span>
                    </div>
                    <p className="personal-home__event-meta">
                      {ev.date} · {ev.classLabel}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="personal-home__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PersonalHomeTab;
