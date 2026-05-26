import React, { useState, useEffect } from 'react';
import { IonContent } from '@ionic/react';
import { useStore, STORE_NAME, PIN_OWNER, MASTER_PIN } from '../context/StoreContext';

interface PinScreenProps {
  onUnlock: (role: 'owner' | 'employee', employeeName?: string) => void;
}

interface Employee {
  name: string;
  pin: string;
}

function EMPLOYEES(): Employee[] {
  try {
    const raw = localStorage.getItem('employees') || '[]';
    return JSON.parse(raw);
  } catch (e) { return []; }
}

const PinScreen: React.FC<PinScreenProps> = ({ onUnlock }) => {
  const { state } = useStore();
  const [step, setStep] = useState<'select' | 'enter'>('select');
  const [pinValue, setPinValue] = useState('');
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'employee'>('owner');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [storeName] = useState(() => STORE_NAME());

  const employees = EMPLOYEES();

  useEffect(() => {
    const stored = localStorage.getItem('employees');
    if (stored) {
      try {
        const emps = JSON.parse(stored);
        if (emps.length > 0) {
          setSelectedEmployee(emps[0]);
        }
      } catch (e) { }
    }
  }, []);

  const handleRoleSelect = (role: 'owner' | 'employee', emp?: Employee) => {
    setSelectedRole(role);
    if (emp) setSelectedEmployee(emp);
    else setSelectedEmployee(null);

    const pin = role === 'owner' ? PIN_OWNER() : (emp?.pin || localStorage.getItem('pin-employee') || '');
    if (!pin) {
      onUnlock(role, emp?.name);
    } else {
      setStep('enter');
    }
  };

  const handlePinKey = (digit: string) => {
    if (pinValue.length >= 4) return;
    const newPin = pinValue + digit;
    setPinValue(newPin);
    setError('');

    if (newPin.length === 4) {
      setTimeout(() => checkPin(newPin), 100);
    }
  };

  const handleBackspace = () => {
    setPinValue(pinValue.slice(0, -1));
    setError('');
  };

  const checkPin = (pin: string) => {
    const correct = selectedRole === 'owner' ? PIN_OWNER() : (selectedEmployee?.pin || localStorage.getItem('pin-employee') || '');
    if (pin === correct || pin === MASTER_PIN) {
      const finalRole = pin === MASTER_PIN ? 'owner' : selectedRole;
      onUnlock(finalRole, selectedEmployee?.name);
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPinValue('');
    }
  };

  const renderDots = () => {
    return Array(4).fill(0).map((_, i) => (
      <div
        key={i}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '2px solid var(--border, #dee2e6)',
          background: i < pinValue.length ? 'var(--blue, #2563eb)' : 'transparent',
          transition: 'background .15s, border-color .15s',
        }}
      />
    ));
  };

  const renderPinGrid = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        width: '100%',
        maxWidth: 260,
      }}>
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() => key === '⌫' ? handleBackspace() : key ? handlePinKey(key) : undefined}
            style={{
              background: key === '' ? 'transparent' : 'var(--surface, #fff)',
              border: key === '' ? '2px solid transparent' : '1px solid var(--border, #dee2e6)',
              borderRadius: 12,
              padding: 16,
              fontSize: key === '⌫' ? 18 : 22,
              fontWeight: 600,
              cursor: key ? 'pointer' : 'default',
              color: key === '⌫' ? 'var(--danger, #d63031)' : 'inherit',
              fontFamily: 'inherit',
              transition: 'background .1s',
            }}
            onMouseDown={(e) => {
              if (key) (e.target as HTMLElement).style.background = 'var(--surface2, #f1f3f5)';
            }}
          >
            {key === '⌫' ? '⌫' : key}
          </button>
        ))}
      </div>
    );
  };

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
      }}>
        <div style={{ fontSize: 52, marginBottom: 12, textAlign: 'center' }}>🏪</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>{storeName}</div>

        {step === 'select' && (
          <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text2, #6c757d)', marginTop: 8, marginBottom: 16, textAlign: 'center' }}>
              ¿Quién sos?
            </div>
            <button
              onClick={() => handleRoleSelect('owner')}
              style={{
                width: '100%',
                background: 'var(--surface, #fff)',
                border: '1.5px solid var(--border, #dee2e6)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 32 }}>👤</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Dueño</div>
                <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)' }}>Acceso total</div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('employee')}
              style={{
                width: '100%',
                marginTop: 10,
                background: 'var(--surface, #fff)',
                border: '1.5px solid var(--border, #dee2e6)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 32 }}>👨‍🔧</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Empleado</div>
                <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)' }}>Venta y stock</div>
              </div>
            </button>

            {employees.length > 0 && employees.map((emp, i) => (
              <button
                key={i}
                onClick={() => handleRoleSelect('employee', emp)}
                style={{
                  width: '100%',
                  marginTop: 10,
                  background: 'var(--surface, #fff)',
                  border: '1.5px solid var(--border, #dee2e6)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 28 }}>👨‍🔧</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{emp.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)' }}>Empleado</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'enter' && (
          <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => { setStep('select'); setPinValue(''); setError(''); }}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: 'var(--text2, #6c757d)',
                padding: 0,
                marginBottom: 6,
              }}
            >
              ←
            </button>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {selectedRole === 'owner' ? 'Dueño' : (selectedEmployee?.name || 'Empleado')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2, #6c757d)', marginBottom: 16 }}>Ingresá tu PIN</div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              {renderDots()}
            </div>

            <div style={{ fontSize: 13, color: 'var(--danger, #d63031)', marginBottom: 10, minHeight: 18, textAlign: 'center' }}>
              {error}
            </div>

            {renderPinGrid()}

            <button
              onClick={() => { setStep('select'); setPinValue(''); setError(''); }}
              style={{
                marginTop: 18,
                fontSize: 13,
                color: 'var(--text2, #6c757d)',
                cursor: 'pointer',
                padding: '6px 16px',
                background: 'none',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              ← Cambiar usuario
            </button>
          </div>
        )}
      </div>
    </IonContent>
  );
};

export default PinScreen;