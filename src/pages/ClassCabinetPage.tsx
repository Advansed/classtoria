import { IonContent, IonPage, IonText } from '@ionic/react';
import './ClassCabinetPage.css';

const ClassCabinetPage: React.FC = () => {
  return (
    <IonPage>
      <IonContent fullscreen className="cabinet-page">
        <div className="cabinet-page__inner">
          <IonText>
            <h1 className="cabinet-page__title">Кабинет класса</h1>
            <p className="cabinet-page__subtitle">Раздел в разработке</p>
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassCabinetPage;
