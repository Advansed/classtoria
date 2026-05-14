import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
} from '@ionic/react';
import { callOutline, lockClosedOutline } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuthPage } from './useAuthPage';
import './AuthPage.css';

const FEATURE_IMG = '/images/auth-feature.png';

const FEATURE_SLIDES = [
  {
    title: 'Ни одно событие теперь не забудете',
    text: 'Все важные моменты класса будут собраны в личном кабинете.',
  },
  {
    title: 'Вечное хранение всех ваших фотографий',
    text: 'Сохраняйте фото безопасно и возвращайтесь к ним в любое время.',
  },
  {
    title: 'Личная память каждого ученика',
    text: 'История школьных лет собирается в одном месте по годам.',
  },
] as const;

const AuthPage: React.FC = () => {
  const { connected, send } = useSocket({ managed: true });
  const pingSentRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!connected || pingSentRef.current) {
      return;
    }
    pingSentRef.current = true;
    send('ping');
  }, [connected, send]);

  const {
    phone,
    sms,
    smsFlow,
    showSmsOption,
    transport,
    phoneError,
    transportError,
    isSending,
    primaryButtonLabel,
    smsHintText,
    handlePhoneChange,
    handleSmsChange,
    handleTransportSelect,
    revealSmsOption,
    selectSmsFlow,
    selectAuthorizeFlow,
    handlePrimaryAction,
    handleSendCode,
    handleAuthorizeViaMax,
  } = useAuthPage();

  const submitLabel = smsFlow ? primaryButtonLabel : 'Войти';

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined;
      if (!first) {
        return;
      }
      const gap = 10;
      const step = first.offsetWidth + gap;
      const i = Math.round(el.scrollLeft / Math.max(step, 1));
      setCarouselIndex(Math.min(FEATURE_SLIDES.length - 1, Math.max(0, i)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollCarouselTo = (index: number) => {
    const el = carouselRef.current;
    if (!el) {
      return;
    }
    const card = el.children[index] as HTMLElement | undefined;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
    setCarouselIndex(index);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="auth-page__content">
        <div className="auth-page">
          <div className="auth-page__wrap">
            <header className="auth-page__site-header">
              <h1 className="auth-page__site-title">Класстория</h1>
              <p className="auth-page__site-subtitle">все фото в одном месте</p>
            </header>

            <section className="auth-page__hero-card" aria-label="Авторизация">
              <h2 className="auth-page__card-title">Авторизация</h2>
              <p className="auth-page__intro">
                Введите номер телефона, который зарегистрирован в белом списке вашего класса. Если номер
                найден, система автоматически определит вашу роль и откроет доступ.
              </p>

              <label className="auth-page__label" htmlFor="auth-phone">
                Введите номер телефона
              </label>
              <div className="auth-page__input-row">
                <IonIcon icon={callOutline} aria-hidden />
                <IonInput
                  id="auth-phone"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  className="auth-page__input"
                  value={phone}
                  inputMode="numeric"
                  maxlength={18}
                  onIonInput={(e) => handlePhoneChange(e.detail.value ?? '')}
                />
              </div>
              {phoneError && <p className="auth-page__error">{phoneError}</p>}

              {smsFlow && (
                <div className="auth-page__sms-block">
                  <label className="auth-page__label" htmlFor="auth-sms">
                    Код из сообщения
                  </label>
                  <div className="auth-page__input-row auth-page__input-row--wide">
                    <IonInput
                      id="auth-sms"
                      type="tel"
                      inputMode="numeric"
                      maxlength={6}
                      placeholder="Введите код"
                      className="auth-page__input"
                      value={sms}
                      onIonInput={(e) => handleSmsChange(e.detail.value ?? '')}
                    />
                  </div>

                  <p className="auth-page__links-text auth-page__links-text--secondary">
                    Уже есть ключ на устройстве?{' '}
                    <button type="button" className="auth-page__inline-link" onClick={selectAuthorizeFlow}>
                      Войти по сохранённому ключу
                    </button>
                  </p>

                  <p className="auth-page__transport-title">{smsHintText}</p>
                  <div className="auth-page__transport-list">
                    <IonButton
                      fill={transport === 'max' ? 'solid' : 'outline'}
                      className="auth-page__transport-button"
                      onClick={() => handleTransportSelect('max')}
                      disabled={isSending}
                    >
                      MAX
                    </IonButton>
                    <IonButton
                      fill={transport === 'telegram' ? 'solid' : 'outline'}
                      className="auth-page__transport-button"
                      onClick={() => handleTransportSelect('telegram')}
                      disabled={isSending}
                    >
                      Telegram
                    </IonButton>
                    {showSmsOption && (
                      <IonButton
                        fill={transport === 'sms' ? 'solid' : 'outline'}
                        className="auth-page__transport-button"
                        onClick={() => handleTransportSelect('sms')}
                        disabled={isSending}
                      >
                        SMS
                      </IonButton>
                    )}
                  </div>
                  {transportError && <p className="auth-page__error">{transportError}</p>}
                  {!showSmsOption && (
                    <button type="button" className="auth-page__show-more" onClick={revealSmsOption}>
                      Если ничего из списка нет
                    </button>
                  )}
                  {transport && (
                    <IonButton
                      expand="block"
                      className="auth-page__submit auth-page__submit--after-sms"
                      onClick={() => void handleSendCode()}
                      disabled={isSending}
                    >
                      Получить код
                    </IonButton>
                  )}
                </div>
              )}

              <IonButton
                expand="block"
                className="auth-page__submit"
                onClick={() => void handlePrimaryAction()}
                disabled={isSending}
              >
                {submitLabel}
              </IonButton>

              {!smsFlow && (
                <div className="auth-page__alt-actions">
                  <p className="auth-page__links-text">
                    Нет аккаунта или новое устройство?{' '}
                    <button
                      type="button"
                      className="auth-page__inline-link"
                      disabled={isSending}
                      onClick={() => void handleAuthorizeViaMax()}
                    >
                      Войти через MAX
                    </button>
                  </p>
                  <p className="auth-page__links-text">
                    Подтвердить номер по SMS или Telegram —{' '}
                    <button type="button" className="auth-page__inline-link" onClick={selectSmsFlow}>
                      другой способ
                    </button>
                  </p>
                </div>
              )}
            </section>

            <section className="auth-page__carousel" aria-label="Возможности">
              <div ref={carouselRef} className="auth-page__carousel-track">
                {FEATURE_SLIDES.map((item) => (
                  <article key={item.title} className="auth-page__feature">
                    <div className="auth-page__feature-img">
                      <img
                        src={FEATURE_IMG}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="auth-page__feature-body">
                      <h3 className="auth-page__feature-title">{item.title}</h3>
                      <p className="auth-page__feature-text">{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="auth-page__dots" role="tablist" aria-label="Слайды">
                {FEATURE_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`auth-page__dot${carouselIndex === i ? ' auth-page__dot--active' : ''}`}
                    aria-label={`Слайд ${i + 1}`}
                    aria-current={carouselIndex === i}
                    onClick={() => scrollCarouselTo(i)}
                  />
                ))}
              </div>
            </section>

            <footer className="auth-page__notice">
              <div className="auth-page__notice-icon-wrap">
                <IonIcon icon={lockClosedOutline} aria-hidden />
              </div>
              <p className="auth-page__notice-text">
                Доступ предоставляется только участникам вашего класса.
              </p>
            </footer>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AuthPage;
