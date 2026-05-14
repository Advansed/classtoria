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
  heartOutline,
  imageOutline,
  imagesOutline,
  bulbOutline,
  addOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { useState } from 'react';
import './PersonalHomeTab.css';

const EVENT_IMG = '/images/start-gallery.png';
const AVATAR = '/images/auth-feature.png';

type FeedTab = 'events' | 'favorites';

const MOCK_CHILDREN = [
  {
    id: '1',
    name: 'София Иванова',
    classLabel: '7Б класс',
    school: 'СОШ №17',
    events: 24,
    photos: 126,
  },
];

const MOCK_EVENTS = [
  { id: '1', title: 'Линейка 1 сентября', date: '01.09.2025', classLabel: '7Б класс', comments: 12, photos: 48, child: 'София' },
  { id: '2', title: 'День знаний', date: '02.09.2025', classLabel: '7Б класс', comments: 8, photos: 32, child: 'София' },
  { id: '3', title: 'Экскурсия в музей', date: '15.09.2025', classLabel: '7Б класс', comments: 5, photos: 24, child: 'София' },
  { id: '4', title: 'Спортивный день', date: '20.09.2025', classLabel: '7Б класс', comments: 15, photos: 56, child: 'София' },
];

const PersonalHomeTab: React.FC = () => {
  const [feedTab, setFeedTab] = useState<FeedTab>('events');

  return (
    <IonPage>
      <IonContent fullscreen className="personal-home">
        <div className="personal-home__scroll">
          <header className="personal-home__header">
            <div className="personal-home__user">
              <div className="personal-home__avatar-wrap">
                <img src={AVATAR} alt="" className="personal-home__avatar" width={48} height={48} />
              </div>
              <div>
                <p className="personal-home__name">Мария Иванова</p>
                <p className="personal-home__role">Роль: Родитель</p>
              </div>
            </div>
            <button  className="personal-home__notify" aria-label="Уведомления, непрочитано: 4">
              <IonIcon icon={notificationsOutline} className="personal-home__notify-icon" aria-hidden />
              <span className="personal-home__notify-text">Уведомления</span>
              <IonBadge color="danger" className="personal-home__notify-badge">4</IonBadge>
            </button>
          </header>

          <section className="personal-home__section" aria-labelledby="personal-children-heading">
            <div className="personal-home__section-head">
              <h2 id="personal-children-heading" className="personal-home__h2">Мои дети</h2>
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

            <div className="personal-home__children-track">
              {MOCK_CHILDREN.map((c) => (
                <article key={c.id} className="personal-home__child-card">
                  <div className="personal-home__child-top">
                    <img src={EVENT_IMG} alt="" className="personal-home__child-avatar" width={56} height={56} />
                    <div>
                      <p className="personal-home__child-name">{c.name}</p>
                      <p className="personal-home__child-meta">{c.classLabel}</p>
                      <p className="personal-home__child-meta">{c.school}</p>
                    </div>
                  </div>
                  <div className="personal-home__child-stats">
                    <span className="personal-home__stat">
                      <IonIcon icon={calendarOutline} aria-hidden />
                      {c.events} события
                    </span>
                    <span className="personal-home__stat">
                      <IonIcon icon={imagesOutline} aria-hidden />
                      {c.photos} сохранено
                    </span>
                  </div>
                  <IonButton expand="block" fill="outline" className="personal-home__child-btn">
                    Перейти в ЛК класса
                    <IonIcon slot="end" icon={chevronForwardOutline} aria-hidden />
                  </IonButton>
                  <button type="button" className="personal-home__child-link">
                    <IonIcon icon={heartOutline} aria-hidden />
                    Написать благодарность учителю класса
                  </button>
                </article>
              ))}
              <button type="button" className="personal-home__add-child">
                <IonIcon icon={addOutline} className="personal-home__add-icon" aria-hidden />
                <span>Добавить ребёнка</span>
              </button>
            </div>
          </section>

          <div className="personal-home__feed-tabs" role="tablist" aria-label="Раздел ленты">
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'events'}
              className={`personal-home__feed-tab${feedTab === 'events' ? ' personal-home__feed-tab--active' : ''}`}
              onClick={() => setFeedTab('events')}
            >
              <IonIcon icon={calendarOutline} aria-hidden />
              События классов
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'favorites'}
              className={`personal-home__feed-tab${feedTab === 'favorites' ? ' personal-home__feed-tab--active' : ''}`}
              onClick={() => setFeedTab('favorites')}
            >
              <IonIcon icon={heartOutline} aria-hidden />
              Избранные фотографии
            </button>
          </div>

          {feedTab === 'events' && (
            <section className="personal-home__section" aria-labelledby="personal-events-heading">
              <h2 id="personal-events-heading" className="personal-home__h2 personal-home__h2--spaced">
                События классов
              </h2>
              <div className="personal-home__event-grid">
                {MOCK_EVENTS.map((ev) => (
                  <article key={ev.id} className="personal-home__event-card">
                    <div className="personal-home__event-img-wrap">
                      <img src={EVENT_IMG} alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className="personal-home__event-body">
                      <h3 className="personal-home__event-title">{ev.title}</h3>
                      <p className="personal-home__event-meta">{ev.date} · {ev.classLabel}</p>
                      <div className="personal-home__event-stats">
                        <span>
                          <IonIcon icon={chatbubbleOutline} aria-hidden />
                          {ev.comments}
                        </span>
                        <span>
                          <IonIcon icon={imageOutline} aria-hidden />
                          {ev.photos}
                        </span>
                      </div>
                      <div className="personal-home__event-chip">
                        <img src={EVENT_IMG} alt="" width={20} height={20} />
                        {ev.child}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {feedTab === 'favorites' && (
            <section className="personal-home__section personal-home__empty-favorites" aria-label="Избранные фотографии">
              <p className="personal-home__empty-text">Здесь появятся избранные снимки из событий классов.</p>
            </section>
          )}

          <aside className="personal-home__tip">
            <IonIcon icon={bulbOutline} className="personal-home__tip-icon" aria-hidden />
            <div>
              <p className="personal-home__tip-title">Полезные советы для родителей</p>
              <p className="personal-home__tip-text">
                Поддерживайте интерес ребёнка к учёбе, хвалите за успехи и создавайте доверительную атмосферу.
              </p>
              <button type="button" className="personal-home__tip-link">
                Читать советы
                <IonIcon icon={chevronForwardOutline} aria-hidden />
              </button>
            </div>
          </aside>

          <div className="personal-home__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PersonalHomeTab;
