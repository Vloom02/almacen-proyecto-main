import React, { useState, useEffect } from 'react';
import { IonContent } from '@ionic/react';
import { STORE_NAME, PIN_OWNER, MASTER_PIN, EMPLOYEES } from '../context/StoreContext';
import { Employee, Role } from '../types';

interface PinScreenProps {
  onUnlock: (role: Role, employeeName?: string) => void;
}

const PinScreen: React.FC<PinScreenProps> = ({ onUnlock }) => {
  const [step, setStep]                       = useState<'select' | 'enter'>('select');
  const [pinValue, setPinValue]               = useState('');
  const [error, setError]                     = useState('');
  const [selectedRole, setSelectedRole]       = useState<Role>('owner');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [storeName]                           = useState(() => STORE_NAME());
  const [employees, setEmployees]             = useState<Employee[]>(() => EMPLOYEES());

  // Refrescamos la lista de empleados al volver a 'select'
  // (por si el dueño los modificó en Config y luego cambió de usuario).
  useEffect(() => {
    if (step === 'select') setEmployees(EMPLOYEES());
  }, [step]);

  const handleRoleSelect = (role: Role, emp?: Employee) => {
    setSelectedRole(role);
    setSelectedEmployee(emp ?? null);

    const pin = role === 'owner' ? PIN_OWNER() : (emp?.pin || '');
    if (!pin) {
      // Sin PIN configurado para ese rol → entra directo.
      onUnlock(role, emp?.name);
    } else {
      setStep('enter');
      setPinValue('');
      setError('');
    }
  };

  const handlePinKey = (digit: string) => {
    if (pinValue.length >= 4) return;
    const newPin = pinValue + digit;
    setPinValue(newPin);
    setError('');
    if (newPin.length === 4) setTimeout(() => checkPin(newPin), 100);
  };

  const handleBackspace = () => { setPinValue(v => v.slice(0, -1)); setError(''); };

  const checkPin = (pin: string) => {
    const correct = selectedRole === 'owner' ? PIN_OWNER() : (selectedEmployee?.pin || '');
    if (pin === correct || pin === MASTER_PIN) {
      // El PIN máster siempre concede rol de dueño (acceso total para soporte).
      const finalRole: Role = pin === MASTER_PIN ? 'owner' : selectedRole;
      onUnlock(finalRole, finalRole === 'owner' ? undefined : selectedEmployee?.name);
    } else {
      setError('PIN incorrecto. Intentá de nuevo.');
      setPinValue('');
    }
  };

  const renderDots = () =>
    [0,1,2,3].map(i => (
      <div key={i} style={{
        width: 16, height: 16, borderRadius: '50%',
        border: `2px solid ${i < pinValue.length ? 'var(--blue, #2563eb)' : 'var(--border, #dee2e6)'}`,
        background: i < pinValue.length ? 'var(--blue, #2563eb)' : 'transparent',
        transition: 'background .15s, border-color .15s',
      }} />
    ));

  const renderPinGrid = () => {
    const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, width:'100%', maxWidth:260 }}>
        {keys.map((k, i) => (
          <button
            key={i}
            type="button"
            onClick={() => k === '⌫' ? handleBackspace() : k ? handlePinKey(k) : undefined}
            disabled={!k}
            aria-label={k === '⌫' ? 'Borrar' : k || 'vacío'}
            style={{
              background: k === '' ? 'transparent' : 'var(--surface, #fff)',
              border: k === '' ? '2px solid transparent' : '1px solid var(--border, #dee2e6)',
              borderRadius: 12, padding: 16,
              fontSize: k === '⌫' ? 18 : 22, fontWeight: 600,
              cursor: k ? 'pointer' : 'default',
              color: k === '⌫' ? 'var(--danger, #d63031)' : 'inherit',
              fontFamily: 'inherit', transition: 'background .1s',
            }}
          >{k}</button>
        ))}
      </div>
    );
  };

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:24 }}>
        <div style={{ fontSize:52, marginBottom:12, textAlign:'center' }}>🏪</div>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:4, textAlign:'center' }}>{storeName}</div>

        {step === 'select' && (
          <div style={{ width:'100%', maxWidth:280, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:14, color:'var(--text2, #6c757d)', marginTop:8, marginBottom:16, textAlign:'center' }}>
              ¿Quién sos?
            </div>

            <button
              type="button"
              onClick={() => handleRoleSelect('owner')}
              style={{
                width:'100%', background:'var(--surface, #fff)',
                border:'1.5px solid var(--border, #dee2e6)', borderRadius:12,
                padding:16, display:'flex', alignItems:'center', gap:14,
                cursor:'pointer', fontFamily:'inherit',
              }}
            >
              <span style={{ fontSize:32 }}>👤</span>
              <div style={{ flex:1, textAlign:'left' }}>
                <div style={{ fontSize:16, fontWeight:700 }}>Dueño</div>
                <div style={{ fontSize:12, color:'var(--text2, #6c757d)' }}>Acceso total</div>
              </div>
            </button>

            {employees.length === 0 ? (
              <button
                type="button"
                onClick={() => handleRoleSelect('employee')}
                style={{
                  width:'100%', marginTop:10, background:'var(--surface, #fff)',
                  border:'1.5px solid var(--border, #dee2e6)', borderRadius:12,
                  padding:16, display:'flex', alignItems:'center', gap:14,
                  cursor:'pointer', fontFamily:'inherit',
                }}
              >
                <span style={{ fontSize:32 }}>🧑‍💼</span>
                <div style={{ flex:1, textAlign:'left' }}>
                  <div style={{ fontSize:16, fontWeight:700 }}>Empleado</div>
                  <div style={{ fontSize:12, color:'var(--text2, #6c757d)' }}>Venta y stock</div>
                </div>
              </button>
            ) : (
              employees.map((emp, i) => (
                <button
                  key={`${emp.name}-${i}`}
                  type="button"
                  onClick={() => handleRoleSelect('employee', emp)}
                  style={{
                    width:'100%', marginTop:10, background:'var(--surface, #fff)',
                    border:'1.5px solid var(--border, #dee2e6)', borderRadius:12,
                    padding:16, display:'flex', alignItems:'center', gap:14,
                    cursor:'pointer', fontFamily:'inherit',
                  }}
                >
                  <span style={{ fontSize:28 }}>🧑‍💼</span>
                  <div style={{ flex:1, textAlign:'left' }}>
                    <div style={{ fontSize:16, fontWeight:700 }}>{emp.name || 'Empleado'}</div>
                    <div style={{ fontSize:12, color:'var(--text2, #6c757d)' }}>Empleado</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === 'enter' && (
          <div style={{ width:'100%', maxWidth:280, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <button
              type="button"
              onClick={() => { setStep('select'); setPinValue(''); setError(''); }}
              style={{ alignSelf:'flex-start', background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text2, #6c757d)', padding:0, marginBottom:6 }}
            >←</button>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>
              {selectedRole === 'owner' ? 'Dueño' : (selectedEmployee?.name || 'Empleado')}
            </div>
            <div style={{ fontSize:14, color:'var(--text2, #6c757d)', marginBottom:16 }}>Ingresá tu PIN</div>

            <div style={{ display:'flex', gap:14, marginBottom:16 }}>{renderDots()}</div>

            <div style={{ fontSize:13, color:'var(--danger, #d63031)', marginBottom:10, minHeight:18, textAlign:'center' }}>
              {error}
            </div>

            {renderPinGrid()}

            <button
              type="button"
              onClick={() => { setStep('select'); setPinValue(''); setError(''); }}
              style={{ marginTop:18, fontSize:13, color:'var(--text2, #6c757d)', cursor:'pointer', padding:'6px 16px', background:'none', border:'none', fontFamily:'inherit' }}
            >← Cambiar usuario</button>
          </div>
        )}
      </div>
    </IonContent>
  );
};

export default PinScreen;
