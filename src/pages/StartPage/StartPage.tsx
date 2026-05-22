import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';
import {
  calendarOutline,
  cameraOutline,
  homeOutline,
  lockClosedOutline,
  personOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './StartPage.css';

const GALLERY_IMG = '/images/start-gallery.png';

const StartPage: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent fullscreen className="start-page">
        <div className="start-page__wrap ion-padding-horizontal">
          <header className="start-page__header">
            <h1 className="start-page__title">Класстория</h1>
            <p className="start-page__subtitle">все фото в одном месте</p>
          </header>

          <section className="start-page__card" aria-label="Событие и фотосессия">
            <div className="start-page__section">
              <div className="start-page__label-row">
                <IonIcon icon={calendarOutline} aria-hidden />
                <p className="start-page__label">Событие</p>
              </div>
              <h2 className="start-page__section-title">Открытый урок</h2>
              <p className="start-page__body-text">
                Урок, на котором родители смогли увидеть, как проходит занятие, как дети отвечают,
                работают в группе и участвуют в обсуждении.
              </p>
            </div>

            <div className="start-page__section">
              <div className="start-page__label-row">
                <IonIcon icon={cameraOutline} aria-hidden />
                <p className="start-page__label">Фотосессия</p>
              </div>
              <h2 className="start-page__section-title">Фотки с открытого урока</h2>
              <div className="start-page__gallery">
                <div className="start-page__thumb start-page__thumb--left">
                  <img src={GALLERY_IMG} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="start-page__thumb start-page__thumb--center">
                  <img src={GALLERY_IMG} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="start-page__thumb start-page__thumb--right">
                  <img src={GALLERY_IMG} alt="" loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
          </section>

          <IonButton
            expand="block"
            className="start-page__auth-btn"
            onClick={() => history.push('/auth')}
          >
            <IonIcon slot="start" icon={personOutline} aria-hidden />
            Авторизация
          </IonButton>

          <p className="start-page__hint">
            Войдите, чтобы посмотреть все фото и видео события
          </p>

          <footer className="start-page__footer">
            <IonIcon icon={lockClosedOutline} aria-hidden />
            <p className="start-page__footer-text">Доступ только для участников события</p>
          </footer>

          <div className="start-page__secondary">
            <IonButton
              fill="clear"
              size="small"
              className="start-page__secondary-btn"
              onClick={() => history.push('/personal/home')}
            >
              <IonIcon slot="start" icon={homeOutline} aria-hidden />
              Личный кабинет
            </IonButton>
            <IonButton
              fill="clear"
              size="small"
              className="start-page__secondary-btn"
              onClick={() => history.push('/personal/class/cabinet')}
            >
              Кабинет класса
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StartPage;
