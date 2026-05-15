import { IonButton, IonContent, IonIcon, IonPage, IonText } from '@ionic/react';
import { peopleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './PersonalClassTab.css';

const PersonalClassTab: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonContent fullscreen className="personal-class-tab">
        <div className="personal-class-tab__inner">
          <div className="personal-class-tab__icon-wrap">
            <IonIcon icon={peopleOutline} aria-hidden />
          </div>
          <IonText>
            <h1 className="personal-class-tab__title">ЛК класса</h1>
            <p className="personal-class-tab__subtitle">
              События, фото и материалы класса — в отдельном разделе.
            </p>
          </IonText>
          <IonButton
            expand="block"
            className="personal-class-tab__btn"
            onClick={() => history.push('/class-cabinet')}
          >
            Открыть кабинет класса
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PersonalClassTab;
