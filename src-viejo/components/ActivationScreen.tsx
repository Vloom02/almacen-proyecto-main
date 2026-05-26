import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonSpinner,
} from '@ionic/react';
import { useStore, STORE_NAME, PIN_OWNER, MASTER_PIN, PLAN_LEVEL, validateCode } from '../context/StoreContext';
import { Role } from '../types';

interface ActivationScreenProps {
  onActivated: () => void;
}

const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivated }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleActivate = () => {
    const level = validateCode(code);
    if (level < 1) {
      setError('Código inválido. Verifica que sea correcto.');
      return;
    }
    localStorage.setItem('plan-level', level.toString());
    setError('');
    onActivated();
  };

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 32,
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏢</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>
          Activar producto
        </div>
        <div style={{
          fontSize: 14,
          color: 'var(--text2, #6c757d)',
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 1.6,
          maxWidth: 290,
        }}>
          Ingresá el código de activación que te dio tu vendedor
        </div>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BAS-0000"
          maxLength={8}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          style={{
            width: '100%',
            maxWidth: 290,
            border: '2px solid var(--border, #dee2e6)',
            borderRadius: 12,
            padding: 14,
            fontSize: 20,
            textAlign: 'center',
            fontFamily: '"Courier New", monospace',
            letterSpacing: 3,
            textTransform: 'uppercase',
            background: 'var(--surface, #fff)',
            color: 'var(--text, #1a1a2e)',
            outline: 'none',
          }}
        />

        <div style={{ fontSize: 13, color: 'var(--danger, #d63031)', marginTop: 8, minHeight: 18, textAlign: 'center', width: '100%', maxWidth: 290 }}>
          {error}
        </div>

        <button
          onClick={handleActivate}
          style={{
            width: '100%',
            maxWidth: 290,
            marginTop: 14,
            padding: 15,
            background: 'var(--blue, #2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Activar
        </button>

        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text2, #6c757d)',
          textTransform: 'uppercase',
          letterSpacing: .5,
          margin: '20px 0 8px',
          textAlign: 'center',
        }}>
          Planes disponibles
        </div>

        <div style={{
          width: '100%',
          maxWidth: 290,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--text2, #6c757d)', borderBottom: '1px solid var(--border, #dee2e6)' }}>
            <span>🏅</span><strong>Básico</strong>&nbsp;BAS-XXXX — Venta + Stock
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--text2, #6c757d)', borderBottom: '1px solid var(--border, #dee2e6)' }}>
            <span>🥈</span><strong>Estandar</strong>&nbsp;EST-XXXX — + Reportes + Categorías
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--text2, #6c757d)', borderBottom: 'none' }}>
            <span>🥇</span><strong>Premium</strong>&nbsp;PRE-XXXX — Todo + PIN empleado
          </div>
        </div>
      </div>
    </IonContent>
  );
};

export default ActivationScreen;