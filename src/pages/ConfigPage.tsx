import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonToast } from '@ionic/react';
import {
  useStore, formatMoney,
  STORE_NAME, STOCK_THRESHOLD, CATEGORIES, PLAN_LEVEL,
  planName, planFeatures, validateCode, PIN_OWNER, MASTER_PIN,
  EMPLOYEES, STORE_ID, setSetting, getSetting,
  dbPut, dbClear, TURSO_ENABLED,
} from '../context/StoreContext';
import { Role, Employee } from '../types';

interface ConfigPageProps {
  currentRole: Role;
  onThemeToggle: () => void;
  isDark: boolean;
  onSwitchUser: () => void;
}

// ─── Small reusable components ────────────────────────────────────────────────
const Divider = () => (
  <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
    {children}
  </h3>
);

const Btn = ({
  children, onClick, color = 'blue', disabled = false, outline = false,
}: {
  children: React.ReactNode; onClick?: () => void; color?: 'blue'|'red'|'green'; disabled?: boolean; outline?: boolean;
}) => {
  const colors: Record<string, string> = {
    blue:  'var(--blue, #2563eb)',
    red:   'var(--danger, #d63031)',
    green: 'var(--ok, #2d9e5f)',
  };
  const c = colors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: 13, border: outline ? `1px solid ${c}` : 'none',
        borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        background: outline ? 'var(--surface2)' : c,
        color: outline ? c : '#fff',
        fontFamily: 'inherit', marginTop: 8, opacity: disabled ? .5 : 1,
      }}
    >{children}</button>
  );
};

const InputField = ({
  label, value, onChange, type = 'text', placeholder, maxLength, rows, hint,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number; rows?: number; hint?: string;
}) => {
  const baseStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: 11,
    fontSize: 15, background: 'var(--surface)', color: 'var(--text)', outline: 'none',
  };
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>}
      {rows ? (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={{ ...baseStyle, fontFamily: 'inherit', resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLength} style={baseStyle} />
      )}
      {hint && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
};

// ─── PIN Modal ────────────────────────────────────────────────────────────────
const PinModal: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  const handleKey = (digit: string) => {
    if (val.length >= 4) return;
    const next = val + digit;
    setVal(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === PIN_OWNER() || next === MASTER_PIN) onSuccess();
        else { setErr('PIN incorrecto. Intentá de nuevo.'); setVal(''); }
      }, 100);
    }
  };

  const handleBack = () => { setVal(v => v.slice(0, -1)); setErr(''); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 500,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '12px 12px 0 0',
        padding: '24px 20px 40px', width: '100%', maxWidth: 520,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Verificar identidad</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, textAlign: 'center' }}>
          Ingresá el PIN actual del dueño
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${i < val.length ? 'var(--blue)' : 'var(--border)'}`,
              background: i < val.length ? 'var(--blue)' : 'transparent',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 10, minHeight: 18 }}>{err}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, width: '100%', maxWidth: 260 }}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            <button key={i} type="button"
              onClick={() => k === '⌫' ? handleBack() : k ? handleKey(k) : undefined}
              disabled={!k}
              style={{
                padding: 16, fontSize: 22, fontWeight: 600, borderRadius: 12,
                border: k === '' ? '2px solid transparent' : '1px solid var(--border)',
                background: k === '' ? 'transparent' : 'var(--surface)',
                cursor: k === '' ? 'default' : 'pointer', fontFamily: 'inherit',
                color: k === '⌫' ? 'var(--danger)' : 'var(--text)',
              }}
            >{k}</button>
          ))}
        </div>
        <button type="button" onClick={onCancel}
          style={{ marginTop: 14, fontSize: 13, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── Main ConfigPage ──────────────────────────────────────────────────────────
const ConfigPage: React.FC<ConfigPageProps> = ({ onThemeToggle, isDark, onSwitchUser }) => {
  const { state, syncNow } = useStore();

  const [toast, setToast]           = useState({ show: false, msg: '', type: 'ok' as 'ok'|'warn'|'err' });
  const [storeName, setStoreName]   = useState('');
  const [threshold, setThreshold]   = useState('');
  const [categories, setCategories] = useState('');
  const [upgradeCode, setUpgrade]   = useState('');
  const [upgradeError, setUpgErr]   = useState('');
  const [pinOwner, setPinOwner]     = useState('');
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [pinsUnlocked, setUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [lastSync, setLastSync]     = useState('');
  const [planLevel, setPlanLevelState] = useState(PLAN_LEVEL());
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Re-leer settings al montar
  useEffect(() => {
    setStoreName(STORE_NAME());
    setThreshold(STOCK_THRESHOLD().toString());
    setCategories(CATEGORIES().join('\n'));
    setEmployees(EMPLOYEES());
    setLastSync(getSetting('last-sync',''));
    setUnlocked(false);
    setPlanLevelState(PLAN_LEVEL());
  }, []);

  const toast$ = (msg: string, type: 'ok'|'warn'|'err' = 'ok') => setToast({ show: true, msg, type });

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleSaveStoreName = () => {
    const v = storeName.trim();
    if (!v) { toast$('El nombre no puede estar vacío.', 'warn'); return; }
    setSetting('store-name', v);
    toast$('Nombre guardado.', 'ok');
  };

  const handleSaveThreshold = () => {
    const v = parseInt(threshold, 10) || 5;
    setSetting('stock-threshold', v.toString());
    toast$(`Alerta: stock ≤ ${v} unidades.`, 'ok');
  };

  const handleSaveCategories = () => {
    setSetting('categories', categories);
    toast$('Categorías guardadas.', 'ok');
  };

  // ── Upgrade plan: validateCode devuelve LicenseInfo | null ─────────────────
  const handleUpgradePlan = () => {
    const info = validateCode(upgradeCode);
    if (!info || info.level < 1) { setUpgErr('Código inválido.'); return; }
    if (info.level <= planLevel)  { setUpgErr('Este código es del mismo plan o inferior.'); return; }

    setSetting('plan-level', info.level.toString());
    if (info.storeId)   setSetting('store-id', info.storeId);
    if (info.expiresAt) setSetting('plan-expires-at', info.expiresAt.toString());

    setUpgrade(''); setUpgErr('');
    setPlanLevelState(info.level);
    toast$(`Plan actualizado a ${planName(info.level)}!`, 'ok');
    window.dispatchEvent(new Event('plan-updated'));
  };

  const handleSavePins = () => {
    if (pinOwner && (pinOwner.length !== 4 || !/^\d{4}$/.test(pinOwner))) {
      toast$('El PIN del dueño debe tener 4 números.', 'warn'); return;
    }
    setSetting('pin-owner', pinOwner);

    const valid = employees.filter(e => e.name.trim());
    for (const emp of valid) {
      if (emp.pin && (emp.pin.length !== 4 || !/^\d{4}$/.test(emp.pin))) {
        toast$(`El PIN de "${emp.name}" debe tener 4 números.`, 'warn'); return;
      }
    }
    setSetting('employees', JSON.stringify(valid));
    toast$('PINs guardados.', 'ok');
    setUnlocked(false);
  };

  // ── Backup ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = {
      version: 4,
      exportedAt: new Date().toISOString(),
      settings: {
        'store-name':       STORE_NAME(),
        'stock-threshold':  STOCK_THRESHOLD().toString(),
        categories:         CATEGORIES().join('\n'),
        'plan-level':       planLevel.toString(),
        'plan-expires-at':  getSetting('plan-expires-at',''),
        'pin-owner':        getSetting('pin-owner',''),
        employees:          getSetting('employees','[]'),
        'store-id':         STORE_ID(),
      },
      products: state.productos,
      sales:    state.sales,
      debts:    state.debts,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `backup-${STORE_NAME().replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSetting('last-backup', Date.now().toString());
    toast$('Backup descargado.', 'ok');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.products || !Array.isArray(data.products)) throw new Error('Archivo inválido (sin productos)');
      if (!confirm(`Restaurar backup del ${new Date(data.exportedAt).toLocaleString('es-AR')}?\n\nEsto reemplaza TODOS los datos actuales.`)) {
        e.target.value = '';
        return;
      }

      await dbClear('products');
      await dbClear('sales');
      await dbClear('debts');
      for (const p of data.products) await dbPut('products', p);
      for (const s of (data.sales ?? [])) await dbPut('sales', s);
      for (const d of (data.debts ?? [])) await dbPut('debts', d);

      if (data.settings) {
        for (const [k, v] of Object.entries(data.settings)) {
          setSetting(k, String(v));
        }
        setStoreName(STORE_NAME());
        setThreshold(STOCK_THRESHOLD().toString());
        setCategories(CATEGORIES().join('\n'));
        setEmployees(EMPLOYEES());
        setPlanLevelState(PLAN_LEVEL());
      }

      toast$('Backup restaurado. Recargá la app para que tome efecto.', 'ok');
    } catch (err: unknown) {
      toast$('Error al importar: ' + (err instanceof Error ? err.message : String(err)), 'err');
    }
    e.target.value = '';
  };

  // ── Turso sync ─────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      const ts = getSetting('last-sync','');
      setLastSync(ts);
      toast$('Sincronización con Turso completa.', 'ok');
    } catch {
      toast$('Error al sincronizar con Turso.', 'err');
    }
    setSyncing(false);
  };

  // ── Clear all ──────────────────────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!confirm('BORRAR TODOS LOS DATOS?\n\nNo se puede deshacer.')) return;
    if (!confirm('Segunda confirmación: ¿estás seguro?')) return;
    await dbClear('products');
    await dbClear('sales');
    await dbClear('debts');
    setSetting('last-backup', '');
    toast$('Todos los datos eliminados.', 'warn');
  };

  const badgeColor = planLevel === 3 ? 'var(--accent)' : planLevel === 2 ? 'var(--blue)' : 'var(--warn)';
  const badgeBg    = planLevel === 3 ? 'var(--accent-bg)' : planLevel === 2 ? 'var(--blue-bg)' : 'var(--warn-bg)';
  const lastBackup = getSetting('last-backup','');
  const lastSyncTs = lastSync || getSetting('last-sync','');

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      {showPinModal && (
        <PinModal
          onSuccess={() => { setShowPinModal(false); setUnlocked(true); }}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>⚙️ Config</h1>
          <button type="button" onClick={onSwitchUser} style={{
            fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
          }}>🔄 Cambiar usuario</button>
        </div>

        {/* Store name */}
        <SectionTitle>Almacén</SectionTitle>
        <InputField label="Nombre del almacén" value={storeName} onChange={setStoreName} placeholder="Ej: Almacén Don Juan" />
        <Btn onClick={handleSaveStoreName}>Guardar nombre</Btn>

        <Divider />

        {/* Theme */}
        <SectionTitle>Apariencia</SectionTitle>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{isDark ? 'Modo oscuro' : 'Modo claro'}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Cambia el fondo de la app</div>
          </div>
          <button type="button" onClick={onThemeToggle} style={{
            width: 46, height: 26, borderRadius: 99,
            background: isDark ? '#3b3f5c' : 'var(--surface3)',
            border: '1px solid var(--border)', position: 'relative', cursor: 'pointer',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: isDark ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: isDark ? '#c7d2fe' : '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,.25)',
              transition: 'left .25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>{isDark ? '🌙' : '☀️'}</div>
          </button>
        </div>

        {/* Stock alerts — plan 2+ */}
        {planLevel >= 2 && (
          <>
            <Divider />
            <SectionTitle>Alertas de stock</SectionTitle>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 5 }}>Alertar cuando stock sea menor o igual a:</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" inputMode="numeric" value={threshold} onChange={e => setThreshold(e.target.value)} min="1" max="100"
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: 11, fontSize: 15, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
              <span style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>unidades</span>
            </div>
            <Btn onClick={handleSaveThreshold}>Guardar</Btn>
          </>
        )}

        {/* Categories — plan 2+ */}
        {planLevel >= 2 && (
          <>
            <Divider />
            <SectionTitle>Categorías</SectionTitle>
            <InputField label="Categorías disponibles (una por línea)" value={categories} onChange={setCategories} rows={6} />
            <Btn onClick={handleSaveCategories}>Guardar categorías</Btn>
          </>
        )}

        <Divider />

        {/* PINs */}
        <SectionTitle>Usuarios y PINs</SectionTitle>
        {!pinsUnlocked ? (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Cambio de PINs protegido</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
              Ingresá el PIN actual del dueño para modificarlos
            </div>
            <Btn onClick={() => PIN_OWNER() ? setShowPinModal(true) : setUnlocked(true)}>🔓 Desbloquear</Btn>
          </div>
        ) : (
          <div>
            <div style={{ background: 'var(--ok-bg)', border: '1px solid #a7f3c9', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--ok-dark)', marginBottom: 14 }}>
              ✓ Sección desbloqueada. Se bloqueará al salir de Config.
            </div>
            <InputField label="PIN del dueño (acceso total)" type="password" value={pinOwner} onChange={setPinOwner} placeholder="••••" maxLength={4} hint="Dejá vacío para no requerir PIN." />
            {planLevel >= 3 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Empleados (hasta 4)</span>
                  <button type="button" onClick={() => {
                    if (employees.length >= 4) { toast$('Máximo 4 empleados.', 'warn'); return; }
                    setEmployees([...employees, { name: '', pin: '' }]);
                  }}
                    style={{ background:'var(--blue-bg)', color:'var(--blue)', border:'1px solid var(--blue)', borderRadius:8, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    + Agregar
                  </button>
                </div>
                {employees.map((emp, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8 }}>
                    <input type="text" value={emp.name}
                      onChange={e => setEmployees(employees.map((el,j) => j===i ? {...el, name:e.target.value} : el))}
                      placeholder="Nombre"
                      style={{ flex:1, border:'1px solid var(--border)', borderRadius:8, padding:8, fontSize:14, background:'var(--surface)', color:'var(--text)', outline:'none' }} />
                    <input type="password" inputMode="numeric" value={emp.pin}
                      onChange={e => setEmployees(employees.map((el,j) => j===i ? {...el, pin:e.target.value} : el))}
                      placeholder="PIN" maxLength={4}
                      style={{ width:70, border:'1px solid var(--border)', borderRadius:8, padding:8, fontSize:16, textAlign:'center', letterSpacing:4, background:'var(--surface)', color:'var(--text)', outline:'none' }} />
                    <button type="button"
                      onClick={() => setEmployees(employees.filter((_,j) => j!==i))}
                      style={{ background:'none', border:'none', color:'var(--danger)', fontSize:18, cursor:'pointer', padding:'0 4px' }}>✕</button>
                  </div>
                ))}
                <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  Cada empleado tiene su nombre y PIN. El historial registra quién realizó cada venta.
                </p>
              </div>
            )}
            <Btn onClick={handleSavePins}>Guardar PINs</Btn>
          </div>
        )}

        <Divider />

        {/* Plan */}
        <SectionTitle>Plan actual</SectionTitle>
        <div style={{ display:'flex', alignItems:'center', marginBottom:14 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:13, fontWeight:700, background:badgeBg, color:badgeColor }}>
            {planLevel===3?'🥇':planLevel===2?'🥈':'🏅'} Plan {planName(planLevel)}
          </span>
        </div>
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14 }}>{planFeatures(planLevel)}</div>
        <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>🔑 Actualizar plan</div>
          <input type="text" value={upgradeCode}
            onChange={e => { setUpgrade(e.target.value.toUpperCase()); setUpgErr(''); }}
            placeholder="EST-0000 o PRE-0000" maxLength={48}
            autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
            style={{ width:'100%', border:'1px solid var(--border)', borderRadius:8, padding:11, fontSize:14, fontFamily:'"Courier New",monospace', textAlign:'center', letterSpacing:2, textTransform:'uppercase', background:'var(--surface)', color:'var(--text)', outline:'none' }} />
          <div style={{ fontSize:13, color:'var(--danger)', marginTop:6, minHeight:18 }}>{upgradeError}</div>
          <Btn onClick={handleUpgradePlan}>Aplicar código</Btn>
        </div>

        <Divider />

        {/* Backup */}
        <SectionTitle>Backup de datos</SectionTitle>
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:10, lineHeight:1.6 }}>
          Los datos se guardan automáticamente. Hacé un backup periódicamente.
        </div>
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>
          Último backup: <strong>{lastBackup ? new Date(parseInt(lastBackup, 10)).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'}) : 'Nunca'}</strong>
        </div>
        <Btn onClick={handleExport}>⬇ Descargar backup</Btn>
        <div style={{ marginTop:12 }}>
          <label style={{ display:'block', fontSize:13, color:'var(--text2)', marginBottom:6 }}>📂 Restaurar desde backup</label>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImport}
            style={{ width:'100%', border:'1px solid var(--border)', borderRadius:8, padding:10, fontSize:14, background:'var(--surface)', color:'var(--text)', cursor:'pointer' }} />
        </div>

        {/* Turso sync — solo se muestra si está configurado */}
        {TURSO_ENABLED && (
          <>
            <Divider />
            <SectionTitle>☁️ Sincronización Turso</SectionTitle>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:10, lineHeight:1.6 }}>
              Sincroniza todos tus datos con la base de datos en la nube para respaldo remoto.
            </div>
            {lastSyncTs && (
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10 }}>
                Última sync: <strong>{new Date(parseInt(lastSyncTs, 10)).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}</strong>
              </div>
            )}
            <div style={{ marginBottom:8 }}>
              <label style={{ display:'block', fontSize:13, color:'var(--text2)', marginBottom:5 }}>ID del almacén (store-id)</label>
              <input type="text" defaultValue={STORE_ID()}
                onBlur={e => setSetting('store-id', e.target.value.trim())}
                placeholder="Ej: almacen-donjuan-01"
                style={{ width:'100%', border:'1px solid var(--border)', borderRadius:8, padding:11, fontSize:14, background:'var(--surface)', color:'var(--text)', outline:'none', fontFamily:'monospace' }} />
              <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Identificador único de este almacén. No usar espacios ni caracteres especiales.</p>
            </div>
            <Btn onClick={handleSync} color="green" disabled={syncing}>
              {syncing ? '⏳ Sincronizando...' : '☁️ Sincronizar ahora'}
            </Btn>
            {state.syncQueueLength > 0 && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--warn)', textAlign:'center' }}>
                ⏳ {state.syncQueueLength} operación{state.syncQueueLength!==1?'es':''} pendiente{state.syncQueueLength!==1?'s':''} de sincronizar
              </div>
            )}
          </>
        )}

        <Divider />

        {/* Danger zone */}
        <SectionTitle>⚠️ Zona peligrosa</SectionTitle>
        <Btn onClick={handleClearAll} color="red" outline>🗑 Borrar todos los datos</Btn>

        {/* Total en deudas (info) */}
        {state.debts.length > 0 && (
          <div style={{ marginTop:14, fontSize:12, color:'var(--text2)' }}>
            Total en deudas activas: <strong>{formatMoney(state.debts.reduce((s,d)=>s+d.amount,0))}</strong>
          </div>
        )}
      </div>

      <IonToast
        isOpen={toast.show}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))}
        message={toast.msg}
        duration={3500}
        position="top"
        color={toast.type === 'ok' ? 'success' : toast.type === 'warn' ? 'warning' : 'danger'}
      />
    </IonContent>
  );
};

export default ConfigPage;
