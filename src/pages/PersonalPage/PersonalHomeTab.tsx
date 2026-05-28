import { IonContent, IonPage } from '@ionic/react';
import {
  Bell,
  ChevronRight,
  Heart,
  ImagePlus,
  PlusCircle,
  Star,
  UserPlus,
} from 'lucide-react';
import { useHistory } from 'react-router-dom';
import { useAvatarDisplayUrl } from '../../hooks/useAvatarDisplayUrl';
import './PersonalHomeTab.css';

const EMPTY_ILLUSTRATION = '/images/auth-feature.png';

const HOW_IT_WORKS = [
  {
    id: 'add',
    title: '1. Добавьте ребенка',
    text: 'Укажите Имя Фамилия, Класс и Школу',
    icon: UserPlus,
  },
  {
    id: 'pick',
    title: '2. Зайдите в кабинет класса и выберите фотографии, которые вы хотите сохранить у себя',
    text: '',
    icon: ImagePlus,
  },
  {
    id: 'save',
    title: '3. Выбранные фотографии также пойдут в личный кабинет вашего ребенка',
    text: '',
    icon: Heart,
  },
] as const;

const PersonalHomeTab: React.FC = () => {
  const history = useHistory();
  const avatarSrc = useAvatarDisplayUrl();

  return (
    <IonPage>
      <IonContent fullscreen className="personal-home">
        <div className="personal-home__scroll">

          <header className="personal-home__header">
            <div>
              <p className="personal-home__title">Мои дети</p>
              <p className="personal-home__subtitle">Добавьте ребёнка, чтобы увидеть его историю</p>
            </div>
            <div className="personal-home__header-actions">
              <button type="button" className="personal-home__notify" aria-label="Уведомления">
                <Bell size={21} />
              </button>
              <img src={avatarSrc} alt="" className="personal-home__avatar" width={42} height={42} />
            </div>
          </header>

          <section className="personal-home__empty-card" aria-label="Нет добавленных детей">
            <div className="personal-home__illustration-wrap">
              <img src={EMPTY_ILLUSTRATION} alt="" className="personal-home__illustration" />
            </div>

            <h2 className="personal-home__empty-title">У вас пока нет добавленных детей</h2>
            <p className="personal-home__empty-text">
              Добавьте ребёнка, чтобы открыть доступ к его школьной истории, событиям класса
              и выбранным фотографиям.
            </p>

            <button
              type="button"
              className="personal-home__add-btn"
              onClick={() => history.push('/personal/child-add')}
            >
              <PlusCircle size={20} />
              Добавить ребёнка
            </button>
          </section>

          <section className="personal-home__how" aria-labelledby="how-title">
            <h2 id="how-title" className="personal-home__how-title">Как это работает</h2>

            <div className="personal-home__steps">
              {HOW_IT_WORKS.map((step) => {
                const Icon = step.icon;
                return (
                  <article key={step.id} className="personal-home__step-card">
                    <span className="personal-home__step-icon-wrap" aria-hidden>
                      <Icon size={20} />
                    </span>
                    <div className="personal-home__step-content">
                      <p className="personal-home__step-title">{step.title}</p>
                      {step.text ? <p className="personal-home__step-text">{step.text}</p> : null}
                    </div>
                    <ChevronRight size={18} className="personal-home__step-chevron" aria-hidden />
                  </article>
                );
              })}
            </div>

            <article className="personal-home__tip-card">
              <span className="personal-home__tip-icon-wrap" aria-hidden>
                <Star size={18} />
              </span>
              <p className="personal-home__tip-text">
                После добавления ребёнка здесь появится его история по годам.
              </p>
            </article>
          </section>

          <div className="personal-home__bottom-spacer" aria-hidden />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PersonalHomeTab;
