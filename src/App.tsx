import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
import { PrivateRoute, RootRedirect } from './authRouteGates';
import Page from './pages/Page';
import ClassCabinetPage from './pages/ClassCabinetPage';
import AuthPage from './pages/AuthPage/AuthPage';
import PersonalPage from './pages/PersonalPage/PersonalPage';
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
              <Route path="/personal">
                <PrivateRoute>
                  <PersonalPage />
                </PrivateRoute>
              </Route>
              <Route path="/class-cabinet" exact={true}>
                <ClassCabinetPage />
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
