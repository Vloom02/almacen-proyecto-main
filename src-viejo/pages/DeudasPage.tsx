import React, { useEffect, useState } from 'react';
import { IonContent, IonToast } from '@ionic/react';
import { useStore, formatMoney } from '../context/StoreContext';
import { Debt } from '../types';

const DeudasPage: React.FC = () => {
  const { state, deleteDebt, addDebt } = useStore();
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'warn' | 'err'>('ok');
  const [showToast, setShowToast] = useState(false);

  const totalDebt = state.debts.reduce((sum, d) => sum + d.amount, 0);

  const showToastMsg = (msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  const handlePayDebt = async (debt: Debt) => {
    if (!confirm(`Marcar la deuda de "${debt.customer}" como pagada y eliminarla?`)) return;
    await deleteDebt(debt.id!);
    showToastMsg(`"${debt.customer}" pagó su deuda.`, 'ok');
  };

  const handleDeleteDebt = async (id: number) => {
    if (!confirm('Eliminar esta deuda?')) return;
    await deleteDebt(id);
  };

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📒 Deudas</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 14 }}>Registro de clientes con saldo pendiente</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Clientes con deuda</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{state.debts.length}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Total adeudado</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Courier New", monospace', paddingTop: 5, color: 'var(--danger, #d63031)' }}>{formatMoney(totalDebt)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {state.debts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text2, #6c757d)' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📒</div>
              <div>No hay deudas registradas</div>
            </div>
          ) : (
            state.debts.map((debt, i) => {
              const itemsStr = debt.items.map(it => `${it.name} x${it.qty}`).join(', ');
              return (
                <div key={i} style={{
                  background: 'var(--surface, #fff)',
                  border: '1px solid var(--border, #dee2e6)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 7,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>👤 {debt.customer}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', marginTop: 2 }}>
                        {new Date(debt.created).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--danger, #d63031)', fontFamily: '"Courier New", monospace' }}>
                        {formatMoney(debt.amount)}
                      </span>
                      <button
                        onClick={() => handlePayDebt(debt)}
                        style={{
                          width: 34,
                          height: 34,
                          border: '1px solid var(--border, #dee2e6)',
                          borderRadius: 8,
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: 15,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ok, #2d9e5f)',
                        }}
                        title="Marcar como pagado"
                      >✓</button>
                      <button
                        onClick={() => handleDeleteDebt(debt.id!)}
                        style={{
                          width: 34,
                          height: 34,
                          border: '1px solid var(--border, #dee2e6)',
                          borderRadius: 8,
                          background: 'none',
                          cursor: 'pointer',
                          fontSize: 15,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--danger, #d63031)',
                        }}
                        title="Eliminar"
                      >✕</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)', marginTop: 6 }}>{itemsStr}</div>
                </div>
              );
            })
          )}
        </div>
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

export default DeudasPage;