import React, { useEffect, useState } from 'react';
import { IonContent } from '@ionic/react';
import { useStore, formatMoney } from '../context/StoreContext';
import { Sale } from '../types';

const HistorialPage: React.FC = () => {
  const { state } = useStore();
  const [weekSales, setWeekSales] = useState<Sale[]>([]);

  useEffect(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = state.sales.filter(s => s.created >= weekAgo).sort((a, b) => b.created - a.created);
    setWeekSales(filtered);
  }, [state.sales]);

  const totalWeek = weekSales.reduce((sum, s) => sum + s.total, 0);

  const exportCSV = () => {
    let csv = '\uFEFFFecha,Hora,Empleado,Cliente,Pago,Descuento,Total,Productos\n';
    for (const sale of weekSales) {
      const d = new Date(sale.created);
      const date = d.toLocaleDateString('es-AR');
      const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const prods = sale.items.map(it => `${it.name} x${it.qty}`).join(' | ');
      const payLabel = sale.payMethod === 'transfer' ? 'Transferencia' : sale.payMethod === 'card' ? 'Tarjeta' : 'Efectivo';
      csv += `"${date}","${time}","${sale.employee || 'Dueño'}","${sale.customer || ''}","${payLabel}","${formatMoney(sale.discount || 0)}","${formatMoney(sale.total)}","${prods}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const groupedByDay: Record<string, Sale[]> = {};
  for (const sale of weekSales) {
    const key = new Date(sale.created).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groupedByDay[key]) groupedByDay[key] = [];
    groupedByDay[key].push(sale);
  }

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📋 Historial</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 14 }}>Ventas de los últimos 7 días</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Ventas semana</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{weekSales.length}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Total semana</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Courier New", monospace', paddingTop: 5 }}>{formatMoney(totalWeek)}</div>
          </div>
        </div>

        <div style={{ background: 'var(--warn-bg, #fef3c7)', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--warn, #e07b20)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          🗑 El historial se borra automáticamente cada 7 días
        </div>

        <button
          onClick={exportCSV}
          style={{
            width: '100%',
            padding: 13,
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'var(--surface2, #f1f3f5)',
            color: 'var(--text, #1a1a2e)',
            fontFamily: 'inherit',
            marginBottom: 12,
          }}
        >
          📊 Exportar a Excel (CSV)
        </button>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {weekSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text2, #6c757d)' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
              <div>No hay ventas esta semana</div>
            </div>
          ) : (
            Object.entries(groupedByDay).map(([day, sales]) => {
              const dayTotal = sales.reduce((sum, s) => sum + s.total, 0);
              return (
                <div key={day} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .6 }}>
                      {day}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border, #dee2e6)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok-dark, #1a6e3f)' }}>{formatMoney(dayTotal)}</span>
                  </div>

                  {sales.map((sale, i) => {
                    const time = new Date(sale.created).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    const itemCount = sale.items.reduce((sum, it) => sum + it.qty, 0);
                    const [open, setOpen] = useState(false);

                    return (
                      <div key={i} style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #dee2e6)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        marginBottom: 7,
                      }}>
                        <div
                          onClick={() => setOpen(!open)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '11px 14px',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)' }}>🕐 {time}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', marginTop: 1 }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ok-dark, #1a6e3f)', fontFamily: '"Courier New", monospace' }}>
                              {formatMoney(sale.total)}
                            </span>
                            <span style={{ color: 'var(--text3, #adb5bd)', fontSize: 18, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : '' }}>›</span>
                          </div>
                        </div>

                        {open && (
                          <div style={{ borderTop: '1px solid var(--border, #dee2e6)', padding: '10px 14px', background: 'var(--surface2, #f1f3f5)' }}>
                            {sale.items.map((item, j) => (
                              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                                <span>{item.name} <span style={{ color: 'var(--text3, #adb5bd)' }}>x{item.qty}</span></span>
                                <span style={{ fontFamily: '"Courier New", monospace' }}>{formatMoney(item.price * item.qty)}</span>
                              </div>
                            ))}
                            {sale.discount > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--ok-dark, #1a6e3f)' }}>
                                <span>Descuento</span>
                                <span style={{ fontFamily: '"Courier New", monospace' }}>-{formatMoney(sale.discount)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, borderTop: '1px dashed var(--border, #dee2e6)', marginTop: 4, paddingTop: 6 }}>
                              <span>Total</span>
                              <span style={{ fontFamily: '"Courier New", monospace' }}>{formatMoney(sale.total)}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', marginTop: 4 }}>
                              {sale.payMethod === 'cash' ? '💵 Efectivo' : sale.payMethod === 'transfer' ? '📱 Transferencia' : '💳 Tarjeta'}
                              {sale.customer ? ` — ${sale.customer}` : ''}
                              {sale.fiado ? ' (Fiado)' : ''}
                              {sale.employee ? ` | 👨‍🔧 ${sale.employee}` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </IonContent>
  );
};

export default HistorialPage;