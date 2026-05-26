import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

import VentaPage     from './pages/VentaPage';
import StockPage     from './pages/StockPage';
import ReportesPage  from './pages/ReportesPage';
import DeudasPage    from './pages/DeudasPage';
import HistorialPage from './pages/HistorialPage';
import ConfigPage    from './pages/ConfigPage';
import PinScreen     from './components/PinScreen';
import ActivationScreen from './components/ActivationScreen';
import Onboarding    from './components/Onboarding';
import TabBar        from './components/TabBar';

import {
  StoreProvider, useStore, PLAN_LEVEL, PIN_OWNER, MASTER_PIN, getSetting, setSetting,
  isLicenseExpired, ONBOARDING_DONE, TURSO_ENABLED,
} from './context/StoreContext';
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

// ── Stock PIN modal ───────────────────────────────────────────────────────────
const StockPinModal: React.FC<{onSuccess:()=>void; onCancel:()=>void}> = ({ onSuccess, onCancel }) => {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  const key = (k: string) => {
    if (val.length >= 4) return;
    const next = val + k;
    setVal(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === PIN_OWNER() || next === MASTER_PIN) onSuccess();
        else { setErr('PIN incorrecto.'); setVal(''); }
      }, 100);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'var(--surface)', borderRadius:'12px 12px 0 0', padding:'24px 20px 40px', width:'100%', maxWidth:520, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ fontSize:36, marginBottom:10 }}>🔒</div>
        <div style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>PIN requerido</div>
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20, textAlign:'center' }}>
          Ingresá el PIN del dueño para modificar el stock
        </div>
        <div style={{ display:'flex', gap:14, marginBottom:12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:16, height:16, borderRadius:'50%',
              border:`2px solid ${i < val.length ? 'var(--blue)' : 'var(--border)'}`,
              background: i < val.length ? 'var(--blue)' : 'transparent',
            }} />
          ))}
        </div>
        <div style={{ fontSize:13, color:'var(--danger)', marginBottom:10, minHeight:18 }}>{err}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%', maxWidth:260 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button key={i} type="button"
              onClick={() => k === '⌫' ? setVal(v => v.slice(0,-1)) : k ? key(k) : undefined}
              disabled={!k}
              style={{
                padding:15, fontSize:k==='⌫'?18:22, fontWeight:600, borderRadius:12, fontFamily:'inherit',
                cursor:k?'pointer':'default',
                border: k === '' ? '2px solid transparent' : '1px solid var(--border)',
                background: k === '' ? 'transparent' : 'var(--surface)',
                color: k === '⌫' ? 'var(--danger)' : 'var(--text)',
              }}
            >{k}</button>
          ))}
        </div>
        <button type="button" onClick={onCancel}
          style={{ marginTop:14, fontSize:13, color:'var(--text2)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ── Sync status indicator ─────────────────────────────────────────────────────
const SyncIndicator: React.FC = () => {
  const { state } = useStore();
  if (!TURSO_ENABLED || state.syncQueueLength === 0) return null;
  return (
    <div style={{
      position:'fixed', top:8, right:8, zIndex:50,
      background:'var(--warn-bg)', border:'1px solid #fde68a', borderRadius:99,
      padding:'4px 10px', fontSize:11, color:'var(--warn)',
      display:'flex', alignItems:'center', gap:4,
    }}>
      ⏳ {state.syncQueueLength} pendiente{state.syncQueueLength > 1 ? 's' : ''}
    </div>
  );
};

// ── Inner app ─────────────────────────────────────────────────────────────────
const InnerApp: React.FC = () => {
  const [currentRole,     setRole]     = useState<Role | null>(null);
  const [currentEmployee, setEmployee] = useState<string | null>(null);
  const [isDark,          setDark]     = useState(false);
  const [planLevel,       setPlan]     = useState(0);
  const [showOnboarding,  setOnboard]  = useState(false);
  const [stockPinCb,      setStockCb]  = useState<(() => void) | null>(null);
  const [showStockPin,    setStockPin] = useState(false);
  const [stockGranted,    setGranted]  = useState(false);
  const stockTimerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init theme + plan from IndexedDB-backed cache
  useEffect(() => {
    const saved = getSetting('theme','');
    const dark  = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(dark);
    document.body.classList.toggle('dark', dark);
    setPlan(PLAN_LEVEL());

    const onPlanUpd = () => setPlan(PLAN_LEVEL());
    window.addEventListener('plan-updated', onPlanUpd);
    return () => {
      window.removeEventListener('plan-updated', onPlanUpd);
      if (stockTimerRef.current) clearTimeout(stockTimerRef.current);
    };
  }, []);

  const handleUnlock = (role: Role, empName?: string) => {
    setRole(role);
    setEmployee(empName ?? null);
    if (role === 'owner' && !ONBOARDING_DONE()) setOnboard(true);
  };

  const handleSwitchUser = () => {
    setRole(null);
    setEmployee(null);
    setGranted(false);
    if (stockTimerRef.current) clearTimeout(stockTimerRef.current);
  };

  const handleThemeToggle = () => {
    const next = !isDark;
    setDark(next);
    document.body.classList.toggle('dark', next);
    setSetting('theme', next ? 'dark' : 'light');
  };

  const resetStockTimer = useCallback(() => {
    if (stockTimerRef.current) clearTimeout(stockTimerRef.current);
    stockTimerRef.current = setTimeout(() => setGranted(false), 2 * 60 * 1000);
  }, []);

  const handleRequirePin = useCallback((cb: () => void) => {
    if (!PIN_OWNER() || stockGranted) { resetStockTimer(); cb(); return; }
    setStockCb(() => cb);
    setStockPin(true);
  }, [stockGranted, resetStockTimer]);

  // Activation check
  if (planLevel === 0 || isLicenseExpired()) {
    return (
      <IonApp>
        <IonReactRouter>
          <ActivationScreen onActivated={() => setPlan(PLAN_LEVEL())} />
        </IonReactRouter>
      </IonApp>
    );
  }

  // Login check
  if (currentRole === null) {
    return (
      <IonApp>
        <IonReactRouter>
          <PinScreen onUnlock={handleUnlock} />
        </IonReactRouter>
      </IonApp>
    );
  }

  return (
    <IonApp className={isDark ? 'dark' : ''}>
      {showOnboarding && <Onboarding onDone={() => setOnboard(false)} />}
      <SyncIndicator />

      <IonReactRouter>
        <IonRouterOutlet id="main">
          <Route path="/venta" exact>
            <VentaPage
              currentRole={currentRole}
              currentEmployee={currentEmployee}
              onRoleBadgeClick={handleSwitchUser}
              onThemeToggle={handleThemeToggle}
              isDark={isDark}
            />
          </Route>
          <Route path="/stock" exact>
            <StockPage currentRole={currentRole} onRequirePin={handleRequirePin} />
          </Route>
          <Route path="/reportes" exact>
            {planLevel >= 2 ? <ReportesPage /> : <Redirect to="/venta" />}
          </Route>
          <Route path="/deudas" exact>
            {planLevel >= 2 ? <DeudasPage /> : <Redirect to="/venta" />}
          </Route>
          <Route path="/historial" exact>
            <HistorialPage />
          </Route>
          <Route path="/config" exact>
            {currentRole === 'owner'
              ? <ConfigPage
                  currentRole={currentRole}
                  onThemeToggle={handleThemeToggle}
                  isDark={isDark}
                  onSwitchUser={handleSwitchUser}
                />
              : <Redirect to="/venta" />}
          </Route>
          <Route path="/" exact><Redirect to="/venta" /></Route>
        </IonRouterOutlet>
        <TabBar currentRole={currentRole} />
      </IonReactRouter>

      {showStockPin && (
        <StockPinModal
          onSuccess={() => {
            setStockPin(false);
            setGranted(true);
            resetStockTimer();
            if (stockPinCb) { stockPinCb(); setStockCb(null); }
          }}
          onCancel={() => { setStockPin(false); setStockCb(null); }}
        />
      )}
    </IonApp>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <StoreProvider>
    <InnerApp />
  </StoreProvider>
);

export default App;
