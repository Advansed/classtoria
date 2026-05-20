import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { homeOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { Redirect, Route } from 'react-router-dom';
import ProfileTab from './components/ProfileTab';
import PersonalClassTab from '../Classes/PersonalClassTab';
import PersonalHomeTab from './PersonalHomeTab';
import './PersonalPage.css';

/**
 * Единая оболочка личных кабинетов: нижняя навигация и вложенные маршруты.
 * «Главная» — кабинет родителя (и далее другие роли в том же разделе при необходимости).
 */
const PersonalPage: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/personal/home" exact={true} component={PersonalHomeTab} />
        <Route path="/personal/class" exact={true} component={PersonalClassTab} />
        <Route path="/personal/profile" exact={true} component={ProfileTab} />
        <Route path="/personal" exact={true}>
          <Redirect to="/personal/home" />
        </Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom" className="personal-page__tab-bar">
        <IonTabButton tab="personal-home" href="/personal/home">
          <IonIcon icon={homeOutline} />
          <IonLabel>Главная</IonLabel>
        </IonTabButton>
        <IonTabButton tab="personal-class" href="/personal/class">
          <IonIcon icon={peopleOutline} />
          <IonLabel>ЛК класса</IonLabel>
        </IonTabButton>
        <IonTabButton tab="personal-profile" href="/personal/profile">
          <IonIcon icon={personOutline} />
          <IonLabel>Профиль</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default PersonalPage;
