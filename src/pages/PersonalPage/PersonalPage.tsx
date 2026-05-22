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
import ClassCabinetPage from '../Classes/components/ClassCabinetPage';
import ClassWhitelistPage from '../Classes/ClassWhitelistPage';
import CollectionUploadPage from '../Classes/components/CollectionUploadPage';
import CreateCollectionPage from '../Classes/components/CreateCollectionPage';
import CreateEventPage from '../Classes/components/CreateEventPage';
import EventUploadPage from '../Classes/components/EventUploadPage';
import EventViewPage from '../Classes/components/EventViewPage';
import Schools from '../Classes/components/Schools';
import {
  CLASSES_BASE,
  CLASSES_CABINET,
  CLASSES_COLLECTION_CREATE,
  CLASSES_COLLECTION_UPLOAD,
  CLASSES_EVENT_CREATE,
  CLASSES_EVENT_VIEW,
  CLASSES_UPLOAD,
  CLASSES_WHITELIST,
} from '../Classes/routes';
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
        <Route path={CLASSES_CABINET} exact={true} component={ClassCabinetPage} />
        <Route path={CLASSES_EVENT_VIEW} exact={true} component={EventViewPage} />
        <Route path={CLASSES_UPLOAD} exact={true} component={EventUploadPage} />
        <Route path={CLASSES_EVENT_CREATE} exact={true} component={CreateEventPage} />
        <Route path={CLASSES_COLLECTION_UPLOAD} exact={true} component={CollectionUploadPage} />
        <Route path={CLASSES_COLLECTION_CREATE} exact={true} component={CreateCollectionPage} />
        <Route path={CLASSES_WHITELIST} exact={true} component={ClassWhitelistPage} />
        <Route path={`${CLASSES_BASE}/parents`} exact={true}>
          <Redirect to={CLASSES_WHITELIST} />
        </Route>
        <Route path={CLASSES_BASE} exact={true} component={Schools} />
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
