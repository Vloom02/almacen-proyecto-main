import React, { useState, useEffect } from 'react';
import { IonContent, IonToast } from '@ionic/react';
import { useStore, formatMoney, STORE_NAME, STOCK_THRESHOLD, CATEGORIES, PLAN_LEVEL, planName, planFeatures, validateCode, PIN_OWNER, MASTER_PIN } from '../context/StoreContext';
import { Role, PlanLevel } from '../types';

interface ConfigPageProps {
  currentRole: Role;
  onThemeToggle: () => void;
  isDark: boolean;
  onSwitchUser: () => void;
}

const ConfigPage: React.FC<ConfigPageProps> = ({ currentRole, onThemeToggle, isDark, onSwitchUser }) => {
  const { state } = useStore();
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'warn' | 'err'>('ok');
  const [showToast, setShowToast] = useState(false);

  const [storeName, setStoreName] = useState(STORE_NAME());
  const [stockThreshold, setStockThreshold] = useState(STOCK_THRESHOLD().toString());
  const [categoriesInput, setCategoriesInput] = useState(CATEGORIES().join('\n'));
  const [upgradeCode, setUpgradeCode] = useState('');
  const [upgradeError, setUpgradeError] = useState('');

  const [pinOwner, setPinOwner] = useState('');
  const [employees, setEmployees] = useState<{ name: string; pin: string }[]>([]);
  const [pinsUnlocked, setPinsUnlocked] = useState(false);

  const planLevel = PLAN_LEVEL();

  useEffect(() => {
    setStoreName(STORE_NAME());
    setStockThreshold(STOCK_THRESHOLD().toString());
    setCategoriesInput(CATEGORIES().join('\n'));
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    try {
      const raw = localStorage.getItem('employees') || '[]';
      setEmployees(JSON.parse(raw));
    } catch (e) { setEmployees([]); }
  };

  const showToastMsg = (msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  const handleSaveStoreName = () => {
    if (!storeName.trim()) return;
    localStorage.setItem('store-name', storeName.trim());
    showToastMsg('Nombre guardado.', 'ok');
  };

  const handleSaveStockThreshold = () => {
    const val = parseInt(stockThreshold) || 5;
    localStorage.setItem('stock-threshold', val.toString());
    showToastMsg(`Alerta: stock <= ${val} unidades.`, 'ok');
  };

  const handleSaveCategories = () => {
    localStorage.setItem('categories', categoriesInput);
    showToastMsg('Categorías guardadas.', 'ok');
  };

  const handleUpgradePlan = () => {
    const level = validateCode(upgradeCode);
    if (level < 1) { setUpgradeError('Código inválido.'); return; }
    const current = PLAN_LEVEL();
    if (level <= current) { setUpgradeError('Este código es del mismo plan o inferior al actual.'); return; }
    localStorage.setItem('plan-level', level.toString());
    setUpgradeCode('');
    setUpgradeError('');
    showToastMsg(`Plan actualizado a ${planName(level)}!`, 'ok');
  };

  const handleSavePins = () => {
    if (pinOwner && (pinOwner.length !== 4 || !/^\d{4}$/.test(pinOwner))) {
      alert('El PIN del dueño debe tener 4 números.'); return;
    }
    localStorage.setItem('pin-owner', pinOwner);

    const validEmps = employees.filter(e => e.name.trim());
    for (const emp of validEmps) {
      if (emp.pin && (emp.pin.length !== 4 || !/^\d{4}$/.test(emp.pin))) {
        alert(`El PIN de "${emp.name}" debe tener 4 números.`); return;
      }
    }
    localStorage.setItem('employees', JSON.stringify(validEmps));

    showToastMsg('PINs guardados correctamente.', 'ok');
    setPinsUnlocked(false);
  };

  const handleUnlockPins = () => {
    if (!PIN_OWNER()) { setPinsUnlocked(true); return; }
    const input = prompt('Ingresá el PIN actual del dueño:');
    if (input === PIN_OWNER() || input === MASTER_PIN) {
      setPinsUnlocked(true);
    } else {
      showToastMsg('PIN incorrecto.', 'err');
    }
  };

  const addEmployeeRow = () => {
    if (employees.length >= 4) { alert('Máximo 4 empleados.'); return; }
    setEmployees([...employees, { name: '', pin: '' }]);
  };

  const removeEmployeeRow = (i: number) => {
    setEmployees(employees.filter((_, idx) => idx !== i));
  };

  const updateEmployee = (i: number, field: 'name' | 'pin', val: string) => {
    const updated = [...employees];
    updated[i] = { ...updated[i], [field]: val };
    setEmployees(updated);
  };

  const handleExportBackup = () => {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      storeName: STORE_NAME(),
      stockThreshold: STOCK_THRESHOLD(),
      categories: CATEGORIES(),
      planLevel: PLAN_LEVEL(),
      products: state.productos,
      sales: state.sales,
      debts: state.debts,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-${STORE_NAME().replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    localStorage.setItem('last-backup', Date.now().toString());
    showToastMsg('Backup descargado.', 'ok');
  };

  const handleClearAll = () => {
    if (!confirm('BORRAR TODOS LOS DATOS?\n\nEsto elimina productos, stock e historial. No se puede deshacer.')) return;
    if (!confirm('Segunda confirmación: estás completamente seguro?')) return;
    localStorage.clear();
    showToastMsg('Todos los datos eliminados.', 'warn');
  };

  const planBadgeClass = (level: number) => {
    if (level === 3) return { bg: 'var(--accent-bg, #ede9fe)', color: 'var(--accent, #6d28d9)' };
    if (level === 2) return { bg: 'var(--blue-bg, #dbeafe)', color: 'var(--blue, #2563eb)' };
    return { bg: 'var(--warn-bg, #fef3c7)', color: 'var(--warn, #e07b20)' };
  };

  const badgeStyle = planBadgeClass(planLevel);

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>⚙️ Config</h1>
          <button
            onClick={onSwitchUser}
            style={{
              fontSize: 13,
              color: 'var(--text2, #6c757d)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--surface2, #f1f3f5)',
              border: '1px solid var(--border, #dee2e6)',
              padding: '6px 12px',
              borderRadius: 99,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            🔄 Cambiar usuario
          </button>
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Almacén</h3>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Nombre del almacén</label>
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Ej: Almacén Don Juan"
          style={{
            width: '100%',
            border: '1px solid var(--border, #dee2e6)',
            borderRadius: 8,
            padding: 11,
            fontSize: 15,
            background: 'var(--surface, #fff)',
            color: 'var(--text, #1a1a2e)',
            outline: 'none',
            marginBottom: 8,
          }}
        />
        <button
          onClick={handleSaveStoreName}
          style={{
            width: '100%',
            padding: 13,
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'var(--blue, #2563eb)',
            color: '#fff',
            fontFamily: 'inherit',
          }}
        >
          Guardar nombre
        </button>

        <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />

        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Apariencia</h3>
        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{isDark ? 'Modo oscuro' : 'Modo claro'}</div>
            <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)', marginTop: 2 }}>Cambia el fondo de la app</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onThemeToggle}
              style={{
                width: 46,
                height: 26,
                borderRadius: 99,
                background: isDark ? '#3b3f5c' : 'var(--surface3, #e9ecef)',
                border: '1px solid var(--border, #dee2e6)',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: isDark ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: isDark ? '#c7d2fe' : '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                transition: 'transform .25s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
              }}>
                {isDark ? '🌙' : '☀️'}
              </div>
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2, #6c757d)' }}>{isDark ? 'Oscuro' : 'Claro'}</span>
          </div>
        </div>

        {planLevel >= 2 && (
          <>
            <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Alertas de stock</h3>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Alertar cuando el stock sea menor o igual a:</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="number"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
                min="1"
                max="100"
                style={{
                  flex: 1,
                  border: '1px solid var(--border, #dee2e6)',
                  borderRadius: 8,
                  padding: 11,
                  fontSize: 15,
                  background: 'var(--surface, #fff)',
                  color: 'var(--text, #1a1a2e)',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text2, #6c757d)', whiteSpace: 'nowrap' }}>unidades</span>
            </div>
            <button
              onClick={handleSaveStockThreshold}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--blue, #2563eb)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              Guardar
            </button>
          </>
        )}

        {planLevel >= 2 && (
          <>
            <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Categorías</h3>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Categorías disponibles (una por línea)</label>
            <textarea
              value={categoriesInput}
              onChange={(e) => setCategoriesInput(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 8,
              }}
            />
            <button
              onClick={handleSaveCategories}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--blue, #2563eb)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              Guardar categorías
            </button>
          </>
        )}

        <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />

        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Usuarios y PINs</h3>

        {!pinsUnlocked ? (
          <div style={{ background: 'var(--surface2, #f1f3f5)', border: '1px solid var(--border, #dee2e6)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Cambio de PINs protegido</div>
            <div style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 14, lineHeight: 1.5 }}>
              Ingresá el PIN actual del dueño para modificarlos
            </div>
            <button
              onClick={handleUnlockPins}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--blue, #2563eb)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              🔓 Desbloquear
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: 'var(--ok-bg, #d3f9e3)', border: '1px solid #a7f3c9', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--ok-dark, #1a6e3f)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✓ Sección desbloqueada. Se bloqueará al salir de Config.
            </div>

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>PIN del dueño (acceso total)</label>
            <input
              type="password"
              value={pinOwner}
              onChange={(e) => setPinOwner(e.target.value)}
              placeholder="••••"
              maxLength={4}
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 20,
                textAlign: 'center',
                letterSpacing: 8,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 10,
              }}
            />

            {planLevel >= 3 && (
              <div style={{ marginTop: 4, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2, #6c757d)' }}>Empleados (hasta 4)</span>
                  <button
                    onClick={addEmployeeRow}
                    style={{
                      background: 'var(--blue-bg, #dbeafe)',
                      color: 'var(--blue, #2563eb)',
                      border: '1px solid var(--blue, #2563eb)',
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    + Agregar
                  </button>
                </div>
                {employees.map((emp, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '10px 12px', background: 'var(--surface2, #f1f3f5)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8 }}>
                    <input
                      type="text"
                      value={emp.name}
                      onChange={(e) => updateEmployee(i, 'name', e.target.value)}
                      placeholder="Nombre"
                      style={{ flex: 1, marginBottom: 0, fontSize: 14, padding: 8, border: '1px solid var(--border, #dee2e6)', borderRadius: 8, background: 'var(--surface, #fff)', color: 'var(--text, #1a1a2e)', outline: 'none' }}
                    />
                    <input
                      type="password"
                      value={emp.pin}
                      onChange={(e) => updateEmployee(i, 'pin', e.target.value)}
                      placeholder="PIN"
                      maxLength={4}
                      style={{ width: 80, marginBottom: 0, fontSize: 16, padding: 8, textAlign: 'center', letterSpacing: 4, border: '1px solid var(--border, #dee2e6)', borderRadius: 8, background: 'var(--surface, #fff)', color: 'var(--text, #1a1a2e)', outline: 'none' }}
                    />
                    <button
                      onClick={() => removeEmployeeRow(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger, #d63031)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
                    >✕</button>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', marginTop: 4 }}>Cada empleado tiene su propio nombre y PIN. El historial registra quién realizó cada venta.</p>
              </div>
            )}

            <button
              onClick={handleSavePins}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--blue, #2563eb)',
                color: '#fff',
                fontFamily: 'inherit',
                marginTop: 8,
              }}
            >
              Guardar PINs
            </button>
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />

        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Plan actual</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 700,
              background: badgeStyle.bg,
              color: badgeStyle.color,
            }}>
              {planLevel === 3 ? '🥇' : planLevel === 2 ? '🥈' : '🏅'} Plan {planName(planLevel)}
            </span>
            <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)', marginTop: 6 }}>{planFeatures(planLevel)}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface2, #f1f3f5)', border: '1px solid var(--border, #dee2e6)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🔐 Actualizar plan</div>
          <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)', marginBottom: 10 }}>Ingresá el código de tu nuevo plan para desbloquearlo.</div>
          <input
            type="text"
            value={upgradeCode}
            onChange={(e) => setUpgradeCode(e.target.value.toUpperCase())}
            placeholder="EST-0000 o PRE-0000"
            maxLength={8}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{
              width: '100%',
              border: '1px solid var(--border, #dee2e6)',
              borderRadius: 8,
              padding: 11,
              fontSize: 14,
              fontFamily: '"Courier New", monospace',
              textAlign: 'center',
              letterSpacing: 2,
              textTransform: 'uppercase',
              background: 'var(--surface, #fff)',
              color: 'var(--text, #1a1a2e)',
              outline: 'none',
              marginBottom: 4,
            }}
          />
          <div style={{ fontSize: 13, color: 'var(--danger, #d63031)', marginBottom: 8, minHeight: 18 }}>{upgradeError}</div>
          <button
            onClick={handleUpgradePlan}
            style={{
              width: '100%',
              padding: 13,
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--blue, #2563eb)',
              color: '#fff',
              fontFamily: 'inherit',
              marginTop: 8,
            }}
          >
            Aplicar código
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />

        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Backup de datos</h3>
        <div style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 10, lineHeight: 1.6 }}>
          Los datos se guardan automáticamente. Hacé un backup periódicamente.
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)', marginBottom: 10 }}>
          Último backup: <strong>{localStorage.getItem('last-backup') ? new Date(parseInt(localStorage.getItem('last-backup')!)).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Nunca'}</strong>
        </div>
        <button
          onClick={handleExportBackup}
          style={{
            width: '100%',
            padding: 13,
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'var(--blue, #2563eb)',
            color: '#fff',
            fontFamily: 'inherit',
          }}
        >
          📥 Descargar backup
        </button>

        <div style={{ height: 1, background: 'var(--border, #dee2e6)', margin: '14px 0' }} />

        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Zona peligrosa</h3>
        <button
          onClick={handleClearAll}
          style={{
            width: '100%',
            padding: 13,
            border: '1px solid var(--danger, #d63031)',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'var(--surface2, #f1f3f5)',
            color: 'var(--danger, #d63031)',
            fontFamily: 'inherit',
          }}
        >
          🗑 Borrar todos los datos
        </button>
      </div>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMsg}
        duration={3500}
        position="top"
        color={toastType === 'ok' ? 'success' : toastType === 'warn' ? 'warning' : 'danger'}
      />
    </IonContent>
  );
};

export default ConfigPage;