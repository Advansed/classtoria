import { IonContent, IonInput, IonPage } from '@ionic/react';
import { Lock, Phone } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuthPage } from './useAuthPage';
import './AuthPage.css';

const AuthPage: React.FC = () => {
  const { connected, send } = useSocket({ managed: true });
  const pingSentRef = useRef(false);

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
    phoneError,
    transportError,
    isSending,
    primaryButtonLabel,
    smsHintText,
    handlePhoneChange,
    handleSmsChange,
    selectSmsFlow,
    selectAuthorizeFlow,
    hasStoredPassword,
    handlePrimaryAction,
    handleSendCode,
  } = useAuthPage();

  return (
    <IonPage>
      <IonContent fullscreen className="auth-page__content">
        <div className="auth-page__wrap">
          <header className="auth-page__site-header">
            <div className="auth-page__logo-cloud" aria-hidden />
            <h1 className="auth-page__site-title">КЭМСТОРИ</h1>
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
              <Phone size={20} className="auth-page__input-icon" aria-hidden />
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
            {phoneError ? <p className="auth-page__error">{phoneError}</p> : null}

            {smsFlow ? (
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

                {hasStoredPassword ? (
                  <p className="auth-page__links-text auth-page__links-text--secondary">
                    Уже есть ключ на устройстве?{' '}
                    <button type="button" className="auth-page__inline-link" onClick={selectAuthorizeFlow}>
                      Войти по сохранённому ключу
                    </button>
                  </p>
                ) : null}

                <p className="auth-page__transport-title">{smsHintText}</p>
                {transportError ? <p className="auth-page__error">{transportError}</p> : null}
                <button
                  type="button"
                  className="auth-page__submit auth-page__submit--secondary"
                  onClick={() => void handleSendCode()}
                  disabled={isSending}
                >
                  Получить код
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="auth-page__submit"
              onClick={() => void handlePrimaryAction()}
              disabled={isSending}
            >
              {primaryButtonLabel}
            </button>

            {!smsFlow ? (
              <p className="auth-page__links-text auth-page__alt-actions">
                Подтвердить номер по SMS —{' '}
                <button type="button" className="auth-page__inline-link" onClick={selectSmsFlow}>
                  другой способ
                </button>
              </p>
            ) : null}
          </section>

          <footer className="auth-page__notice">
            <span className="auth-page__notice-icon-wrap" aria-hidden>
              <Lock size={18} />
            </span>
            <p className="auth-page__notice-text">
              Доступ предоставляется только участникам вашего класса.
            </p>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AuthPage;
