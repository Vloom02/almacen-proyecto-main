import React, { useEffect, useState } from 'react';
import { IonContent } from '@ionic/react';
import { useStore, formatMoney, PLAN_LEVEL } from '../context/StoreContext';
import { Sale } from '../types';

const ReportesPage: React.FC = () => {
  const { state } = useStore();
  const [weekSales, setWeekSales] = useState<Sale[]>([]);

  useEffect(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = state.sales.filter(s => s.created >= weekAgo);
    setWeekSales(filtered.sort((a, b) => a.created - b.created));
  }, [state.sales]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = weekSales.filter(s => s.created >= today.getTime());

  const totalHoy = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalSem = weekSales.reduce((sum, s) => sum + s.total, 0);

  const getDayBars = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d.getTime());
      dEnd.setDate(dEnd.getDate() + 1);

      const daySales = weekSales.filter(s => s.created >= d.getTime() && s.created < dEnd.getTime());
      const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
      const label = d.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3);

      days.push({ label, total: dayTotal, count: daySales.length });
    }
    return days;
  };

  const bars = getDayBars();
  const maxTotal = Math.max(...bars.map(b => b.total), 1);

  const getTopProducts = () => {
    const productMap: Record<string, { qty: number; total: number }> = {};
    for (const sale of weekSales) {
      for (const item of sale.items) {
        if (!productMap[item.name]) productMap[item.name] = { qty: 0, total: 0 };
        productMap[item.name].qty += item.qty;
        productMap[item.name].total += item.price * item.qty;
      }
    }
    return Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📊 Reportes</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 14 }}>Últimos 7 días</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Ventas hoy</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{todaySales.length}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Total hoy</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Courier New", monospace', paddingTop: 5 }}>{formatMoney(totalHoy)}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Ventas semana</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{weekSales.length}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Total semana</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Courier New", monospace', paddingTop: 5 }}>{formatMoney(totalSem)}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
            Ventas por día
          </h3>
          {bars.map((bar, i) => {
            const pct = Math.round((bar.total / maxTotal) * 100);
            const valInside = pct > 30;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', width: 32, textAlign: 'right', flexShrink: 0 }}>{bar.label}</div>
                <div style={{ flex: 1, background: 'var(--surface3, #e9ecef)', borderRadius: 99, height: 22, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: bar.count > 0 ? 'var(--blue, #2563eb)' : 'transparent',
                    borderRadius: 99,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    minWidth: 4,
                    width: `${Math.max(pct, 2)}%`,
                  }}>
                    {valInside && bar.count > 0 && (
                      <span style={{ fontSize: 11, color: '#fff', whiteSpace: 'nowrap', fontWeight: 600 }}>{formatMoney(bar.total)}</span>
                    )}
                  </div>
                  {!valInside && bar.total > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text2, #6c757d)', paddingLeft: 6 }}>{formatMoney(bar.total)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 12, padding: 14 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
            Top 5 productos
          </h3>
          {topProducts.length === 0 ? (
            <div style={{ color: 'var(--text2, #6c757d)', fontSize: 13, padding: 12, textAlign: 'center' }}>Sin ventas esta semana</div>
          ) : (
            topProducts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border, #dee2e6)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--blue-bg, #dbeafe)',
                    color: 'var(--blue, #2563eb)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 14, marginLeft: 10 }}>{p.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginRight: 8 }}>{p.qty} unid.</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ok-dark, #1a6e3f)', fontFamily: '"Courier New", monospace' }}>{formatMoney(p.total)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </IonContent>
  );
};

export default ReportesPage;