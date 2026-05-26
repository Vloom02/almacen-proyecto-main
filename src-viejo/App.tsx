import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Menu from './components/Menu';
import VentaPage from './pages/VentaPage';
import StockPage from './pages/StockPage';
import ReportesPage from './pages/ReportesPage';
import DeudasPage from './pages/DeudasPage';
import HistorialPage from './pages/HistorialPage';
import ConfigPage from './pages/ConfigPage';
import PinScreen from './components/PinScreen';
import ActivationScreen from './components/ActivationScreen';
import { StoreProvider, PLAN_LEVEL, STORE_NAME } from './context/StoreContext';
import { Role } from './types';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';

import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [stockPinGranted, setStockPinGranted] = useState(false);
  const [stockPinCallback, setStockPinCallback] = useState<(() => void) | null>(null);
  const planLevel = PLAN_LEVEL();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.body.classList.add('dark');
    }
  }, []);

  const handleUnlock = (role: Role, employeeName?: string) => {
    setCurrentRole(role);
    setCurrentEmployee(employeeName || null);
  };

  const handleSwitchUser = () => {
    setCurrentRole(null);
    setCurrentEmployee(null);
  };

  const handleThemeToggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.body.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const handleRequirePin = (callback: () => void) => {
    const pinOwner = localStorage.getItem('pin-owner') || '';
    if (!pinOwner || stockPinGranted) {
      setStockPinGranted(true);
      setTimeout(() => setStockPinGranted(false), 2 * 60 * 1000);
      callback();
      return;
    }
    setStockPinCallback(() => callback);
  };

  const handleStockPinSuccess = () => {
    setStockPinGranted(true);
    setTimeout(() => setStockPinGranted(false), 2 * 60 * 1000);
    if (stockPinCallback) {
      stockPinCallback();
      setStockPinCallback(null);
    }
  };

  if (planLevel === 0) {
    return (
      <StoreProvider>
        <IonApp>
          <IonReactRouter>
            <ActivationScreen onActivated={() => window.location.reload()} />
          </IonReactRouter>
        </IonApp>
      </StoreProvider>
    );
  }

  if (currentRole === null) {
    return (
      <StoreProvider>
        <IonApp>
          <IonReactRouter>
            <PinScreen onUnlock={handleUnlock} />
          </IonReactRouter>
        </IonApp>
      </StoreProvider>
    );
  }

  return (
    <StoreProvider>
      <IonApp className={isDark ? 'dark' : ''}>
        <IonReactRouter>
          <IonSplitPane contentId="main" when="md">
            <Menu />
            <IonRouterOutlet id="main">
              <Route path="/venta" exact={true}>
                <VentaPage
                  currentRole={currentRole}
                  currentEmployee={currentEmployee}
                  onRoleBadgeClick={handleSwitchUser}
                  onThemeToggle={handleThemeToggle}
                  isDark={isDark}
                />
              </Route>
              <Route path="/stock" exact={true}>
                <StockPage currentRole={currentRole} onRequirePin={handleRequirePin} />
              </Route>
              <Route path="/reportes" exact={true}>
                {planLevel >= 2 ? <ReportesPage /> : <Redirect to="/venta" />}
              </Route>
              <Route path="/deudas" exact={true}>
                {planLevel >= 2 ? <DeudasPage /> : <Redirect to="/venta" />}
              </Route>
              <Route path="/historial" exact={true}>
                <HistorialPage />
              </Route>
              <Route path="/config" exact={true}>
                {currentRole === 'owner' ? (
                  <ConfigPage
                    currentRole={currentRole}
                    onThemeToggle={handleThemeToggle}
                    isDark={isDark}
                    onSwitchUser={handleSwitchUser}
                  />
                ) : <Redirect to="/venta" />}
              </Route>
              <Route path="/" exact={true}>
                <Redirect to="/venta" />
              </Route>
            </IonRouterOutlet>
          </IonSplitPane>
        </IonReactRouter>
      </IonApp>
    </StoreProvider>
  );
};

export default App;