import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import {
  callOutline,
  cameraOutline,
  checkmarkCircle,
  chevronBackOutline,
  chevronForwardOutline,
  mailOutline,
  peopleOutline,
  personOutline,
  ribbonOutline,
  schoolOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { clearAuthCookies } from '../../../authCookies';
import { useClassesStore } from '../../Classes/classesStore';
import { useStore } from '../../../Store';
import { useProfile } from './useProfile';
import './ProfileTab.css';

const FALLBACK_AVATAR = '/images/auth-feature.png';

type RoleId = 'parent' | 'teacher' | 'student';

const roleLabel: Record<RoleId, string> = {
  parent: 'Родитель',
  teacher: 'Учитель',
  student: 'Ученик',
};

const parseRoleId = (role: string | undefined): RoleId => {
  const r = (role ?? '').toLowerCase();
  if (r === 'teacher' || r.includes('учител')) return 'teacher';
  if (r === 'student' || r.includes('ученик')) return 'student';
  if (r === 'parent' || r.includes('родител')) return 'parent';
  return 'parent';
};

/** Вкладка «Профиль» внутри PersonalPage. Корень — IonPage (требование IonTabs для стека). */
const ProfileTab: React.FC = () => {
  const history = useHistory();
  const {
    profile,
    avatarDisplayUrl,
    loading,
    saving,
    uploadingAvatar,
    name,
    setName,
    email,
    setEmail,
    isDirty,
    save,
    uploadAvatar,
  } = useProfile();
  const [activeRole, setActiveRole] = useState<RoleId>('parent');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.role) {
      setActiveRole(parseRoleId(profile.role));
    }
  }, [profile?.role]);

  useEffect(
    () => () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    },
    [avatarPreview],
  );

  const handleLogout = () => {
    clearAuthCookies();
    useStore.getState().reset();
    useClassesStore.getState().reset();
    history.replace('/start');
  };

  const avatarSrc = avatarPreview || avatarDisplayUrl || FALLBACK_AVATAR;
  const displayPhone = profile?.phone?.trim() || '—';
  const displayRole = roleLabel[activeRole];

  const rolePillIcon =
    activeRole === 'parent' ? peopleOutline : activeRole === 'teacher' ? schoolOutline : personOutline;

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return preview;
    });

    void (async () => {
      try {
        await uploadAvatar(file);
      } finally {
        setAvatarPreview((current) => {
          if (current === preview) {
            URL.revokeObjectURL(preview);
            return null;
          }
          return current;
        });
      }
    })();
  };

  return (
    <IonPage>
      <IonContent fullscreen className="personal-profile-tab">
        <div className="personal-profile-tab__toolbar">
          <IonButton routerLink="/personal/home" routerDirection="back" fill="clear" aria-label="Назад">
            <IonIcon slot="icon-only" icon={chevronBackOutline} aria-hidden />
          </IonButton>
          <h1 className="personal-profile-tab__title">Профиль</h1>
          <img
            key={avatarSrc}
            src={avatarSrc}
            alt=""
            className="personal-profile-tab__header-avatar"
            width={32}
            height={32}
          />
        </div>

        {loading && !profile ? (
          <div className="profile-page__loading" aria-busy="true">
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <div className="profile-page__inner">
            <section className="profile-page__card profile-page__user-card">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="profile-page__avatar-input"
                aria-hidden
                tabIndex={-1}
                onChange={handleAvatarChange}
              />
              <div className="profile-page__user-top">
                <button
                  type="button"
                  className="profile-page__avatar-btn"
                  onClick={handleAvatarPick}
                  disabled={uploadingAvatar}
                  aria-label="Изменить аватар"
                >
                  <div className="profile-page__avatar-lg-wrap">
                    <img
                    key={avatarSrc}
                    src={avatarSrc}
                    alt=""
                    className="profile-page__avatar-lg"
                    width={96}
                    height={96}
                  />
                    {uploadingAvatar ? (
                      <span className="profile-page__avatar-overlay" aria-hidden>
                        <IonSpinner name="crescent" />
                      </span>
                    ) : (
                      <span className="profile-page__avatar-overlay" aria-hidden>
                        <IonIcon icon={cameraOutline} />
                      </span>
                    )}
                  </div>
                </button>
                <div className="profile-page__user-meta">
                  <div className="profile-page__field">
                    <span className="profile-page__field-label">
                      <IonIcon icon={callOutline} aria-hidden />
                      Телефон
                    </span>
                    <p className="profile-page__field-value">{displayPhone}</p>
                  </div>
                  <div className="profile-page__field">
                    <span className="profile-page__field-label">
                      <IonIcon icon={shieldCheckmarkOutline} aria-hidden />
                      Роль
                    </span>
                    <span className="profile-page__role-pill">
                      <IonIcon icon={rolePillIcon} aria-hidden />
                      {displayRole}
                    </span>
                  </div>
                </div>
              </div>
              <div className="profile-page__user-editable">
                <div className="profile-page__field profile-page__field--wide">
                  <label className="profile-page__field-label" htmlFor="profile-name">
                    <IonIcon icon={personOutline} aria-hidden />
                    ФИО
                  </label>
                  <IonInput
                    id="profile-name"
                    className="profile-page__input"
                    value={name}
                    placeholder="Введите ФИО"
                    onIonInput={(e) => setName(e.detail.value ?? '')}
                  />
                </div>
                <div className="profile-page__field profile-page__field--wide">
                  <label className="profile-page__field-label" htmlFor="profile-email">
                    <IonIcon icon={mailOutline} aria-hidden />
                    Email
                  </label>
                  <IonInput
                    id="profile-email"
                    type="email"
                    inputMode="email"
                    className="profile-page__input"
                    value={email}
                    placeholder="email@example.com"
                    onIonInput={(e) => setEmail(e.detail.value ?? '')}
                  />
                </div>
              </div>
            </section>

            {isDirty && (
              <IonButton
                expand="block"
                className="profile-page__save"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? <IonSpinner name="crescent" /> : 'Сохранить'}
              </IonButton>
            )}

            <button type="button" className="profile-page__banner">
              <IonIcon icon={ribbonOutline} className="profile-page__banner-icon" aria-hidden />
              <div className="profile-page__banner-text">
                <p className="profile-page__banner-title">История сохранена до 05.07.2027</p>
                <p className="profile-page__banner-sub">Тариф «Семейный»</p>
                <p className="profile-page__banner-foot">
                  Все ваши фото и видео надёжно хранятся в облаке.
                </p>
              </div>
              <IonIcon icon={chevronForwardOutline} className="profile-page__banner-chevron" aria-hidden />
            </button>

            <section className="profile-page__roles-section" aria-labelledby="profile-roles-title">
              <h2 id="profile-roles-title" className="profile-page__roles-title">Роли в системе</h2>
              <p className="profile-page__roles-intro">
                Вы можете переключаться между ролями, связанными с вашим аккаунтом.
              </p>

              <div className="profile-page__roles-list">
                <button
                  type="button"
                  className={`profile-page__role-item${activeRole === 'parent' ? ' profile-page__role-item--selected' : ''}`}
                  onClick={() => setActiveRole('parent')}
                >
                  <IonIcon icon={peopleOutline} className="profile-page__role-item-icon" aria-hidden />
                  <div className="profile-page__role-item-body">
                    <p className="profile-page__role-item-name">Родитель</p>
                    <p className="profile-page__role-item-desc">
                      Доступ к событиям и фотографиям ваших детей
                    </p>
                  </div>
                  {activeRole === 'parent' ? (
                    <IonIcon icon={checkmarkCircle} className="profile-page__role-check" aria-hidden />
                  ) : (
                    <IonIcon icon={chevronForwardOutline} className="profile-page__role-chevron" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  className={`profile-page__role-item${activeRole === 'teacher' ? ' profile-page__role-item--selected' : ''}`}
                  onClick={() => setActiveRole('teacher')}
                >
                  <IonIcon icon={schoolOutline} className="profile-page__role-item-icon" aria-hidden />
                  <div className="profile-page__role-item-body">
                    <p className="profile-page__role-item-name">Учитель</p>
                    <p className="profile-page__role-item-desc">
                      Доступ к событиям, классам и ученикам
                    </p>
                  </div>
                  {activeRole === 'teacher' ? (
                    <IonIcon icon={checkmarkCircle} className="profile-page__role-check" aria-hidden />
                  ) : (
                    <IonIcon icon={chevronForwardOutline} className="profile-page__role-chevron" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  className={`profile-page__role-item${activeRole === 'student' ? ' profile-page__role-item--selected' : ''}`}
                  onClick={() => setActiveRole('student')}
                >
                  <IonIcon icon={personOutline} className="profile-page__role-item-icon" aria-hidden />
                  <div className="profile-page__role-item-body">
                    <p className="profile-page__role-item-name">Ученик</p>
                    <p className="profile-page__role-item-desc">
                      Личный доступ к своим событиям и фотографиям
                    </p>
                  </div>
                  {activeRole === 'student' ? (
                    <IonIcon icon={checkmarkCircle} className="profile-page__role-check" aria-hidden />
                  ) : (
                    <IonIcon icon={chevronForwardOutline} className="profile-page__role-chevron" aria-hidden />
                  )}
                </button>
              </div>
            </section>

            <IonButton expand="block" fill="clear" color="medium" className="profile-page__logout" onClick={handleLogout}>
              Выйти из аккаунта
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ProfileTab;
