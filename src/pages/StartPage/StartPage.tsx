import { IonContent, IonPage } from '@ionic/react';
import { Calendar, Lock, User } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import './StartPage.css';

const StartPage: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent fullscreen className="start-page">
        <div className="start-page__wrap">
          <header className="start-page__header">
            <div className="start-page__logo-cloud" aria-hidden />
            <h1 className="start-page__title">КЭМСТОРИ</h1>
            <p className="start-page__subtitle">все фото в одном месте</p>
          </header>

          <section className="start-page__card" aria-label="Событие">
            <div className="start-page__label-row">
              <Calendar size={18} className="start-page__label-icon" aria-hidden />
              <p className="start-page__label">Событие</p>
            </div>
            <h2 className="start-page__event-title">Открытый урок</h2>
            <p className="start-page__body-text">
              Урок, на котором родители смогли увидеть, как проходит занятие, как дети отвечают,
              работают в группе и участвуют в обсуждении.
            </p>
          </section>

          <button
            type="button"
            className="start-page__auth-btn"
            onClick={() => history.push('/auth')}
          >
            <User size={22} strokeWidth={2} aria-hidden />
            Авторизация
          </button>

          <p className="start-page__hint">
            Войдите, чтобы посмотреть все фото и видео события
          </p>

          <footer className="start-page__access">
            <Lock size={16} aria-hidden />
            <p className="start-page__access-text">Доступ только для участников события</p>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StartPage;
