import React, { useState } from 'react';
import { IonContent } from '@ionic/react';
import { validateCode, setSetting, planName, isLicenseExpired, PLAN_LEVEL } from '../context/StoreContext';

interface Props { onActivated: () => void; }

const ActivationScreen: React.FC<Props> = ({ onActivated }) => {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);
  const isExpired = isLicenseExpired();
  const currentPlan = PLAN_LEVEL();

  const handleActivate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const info = validateCode(code.trim());
      if (!info) { setError('Código inválido. Verificá que sea correcto.'); return; }
      if (info.level < 1) { setError('Código sin plan válido.'); return; }
      await setSetting('plan-level', info.level.toString());
      if (info.storeId)  await setSetting('store-id', info.storeId);
      if (info.expiresAt) await setSetting('plan-expires-at', info.expiresAt.toString());
      setError('');
      onActivated();
    } finally {
      setBusy(false);
    }
  };

  const plans = [
    { emoji:'🏅', label:'Básico',    code:'BAS-XXXX', desc:'Venta · Stock · Historial · Backup' },
    { emoji:'🥈', label:'Estándar',  code:'EST-XXXX', desc:'+ Reportes · Categorías · Deudas' },
    { emoji:'🥇', label:'Premium',   code:'PRE-XXXX', desc:'+ PIN empleado · Sesiones · Sync Turso' },
  ];

  return (
    <IonContent style={{ '--background':'var(--bg)' } as React.CSSProperties}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:32 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🏪</div>
        {isExpired && currentPlan > 0 ? (
          <>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:8, textAlign:'center', color:'var(--danger)' }}>Licencia vencida</div>
            <div style={{ fontSize:14, color:'var(--text2)', textAlign:'center', marginBottom:24, lineHeight:1.6, maxWidth:290 }}>
              Tu plan {planName(currentPlan)} venció. Contactá a tu vendedor para renovar o ingresar un código nuevo.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:8, textAlign:'center' }}>Activar producto</div>
            <div style={{ fontSize:14, color:'var(--text2)', textAlign:'center', marginBottom:24, lineHeight:1.6, maxWidth:290 }}>
              Ingresá el código de activación que te dio tu vendedor
            </div>
          </>
        )}

        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') handleActivate(); }}
          placeholder="BAS-0000" maxLength={48}
          autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
          aria-label="Código de activación"
          style={{ width:'100%', maxWidth:290, border:'2px solid var(--border)', borderRadius:12, padding:14, fontSize:20, textAlign:'center', fontFamily:'"Courier New",monospace', letterSpacing:3, textTransform:'uppercase', background:'var(--surface)', color:'var(--text)', outline:'none' }}
        />
        <div role="alert" style={{ fontSize:13, color:'var(--danger)', marginTop:8, minHeight:18, textAlign:'center', width:'100%', maxWidth:290 }}>{error}</div>
        <button
          type="button"
          onClick={handleActivate}
          disabled={busy || !code.trim()}
          style={{ width:'100%', maxWidth:290, marginTop:14, padding:15, background:'var(--blue)', color:'#fff', border:'none', borderRadius:12, fontSize:16, fontWeight:700, cursor:busy?'wait':'pointer', fontFamily:'inherit', opacity: (busy || !code.trim()) ? 0.6 : 1 }}
        >
          {busy ? 'Activando…' : 'Activar'}
        </button>

        <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.5, margin:'20px 0 8px', textAlign:'center' }}>Planes disponibles</div>
        <div style={{ width:'100%', maxWidth:290 }}>
          {plans.map((p,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', fontSize:13, color:'var(--text2)', borderBottom:i<plans.length-1?'1px solid var(--border)':'none' }}>
              <span style={{ fontSize:18 }}>{p.emoji}</span>
              <div>
                <strong style={{ color:'var(--text)' }}>{p.label}</strong> &mdash; <code style={{ fontSize:12 }}>{p.code}</code>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </IonContent>
  );
};

export default ActivationScreen;
