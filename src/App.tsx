import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { PrivateRoute, RootRedirect } from './authRouteGates';
import Page from './pages/Page';
import { CLASSES_CABINET, CLASSES_WHITELIST } from './pages/Classes/routes';
import AuthPage from './pages/AuthPage/AuthPage';
import PersonalPage from './pages/PersonalPage/PersonalPage';
import PublicCollectionPage from './pages/PublicEvent/PublicCollectionPage';
import PublicEventPage from './pages/PublicEvent/PublicEventPage';
import PublicImagePage from './pages/PublicEvent/PublicImagePage';
import StartPage from './pages/StartPage/StartPage';
import './App.css';

import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  return (
    <IonApp className="app-root">
      <IonReactRouter>
        <div className="app-stage">
          <div className="phone-shell">
            <IonRouterOutlet id="main" className="app-main-router-outlet">
              <Route path="/" exact={true}>
                <RootRedirect />
              </Route>
              <Route path="/start" exact={true}>
                <StartPage />
              </Route>
              <Route
                path="/event/:eventId/collection/:collectionId/photo/:imageId"
                exact={true}
                component={PublicImagePage}
              />
              <Route
                path="/event/:eventId/collection/:collectionId"
                exact={true}
                component={PublicCollectionPage}
              />
              <Route path="/event/:eventId" exact={true} component={PublicEventPage} />
              <Route path="/personal">
                <PrivateRoute>
                  <PersonalPage />
                </PrivateRoute>
              </Route>
              <Route path="/class-cabinet/whitelist" exact={true}>
                <Redirect to={CLASSES_WHITELIST} />
              </Route>
              <Route path="/class-cabinet/parents" exact={true}>
                <Redirect to={CLASSES_WHITELIST} />
              </Route>
              <Route path="/class-cabinet" exact={true}>
                <Redirect to={CLASSES_CABINET} />
              </Route>
              <Route path="/auth" exact={true}>
                <AuthPage />
              </Route>
              <Route path="/folder/:name" exact={true}>
                <Page />
              </Route>
            </IonRouterOutlet>
          </div>
        </div>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
