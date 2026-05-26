import React, { useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { useStore, formatMoney } from '../context/StoreContext';

const ReportesPage: React.FC = () => {
  const { state } = useStore();

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const weekSales = useMemo(() =>
    state.sales.filter(s => s.created >= weekAgo).sort((a,b) => a.created - b.created),
    [state.sales, weekAgo]
  );

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d.getTime();
  }, []);

  const todaySales = useMemo(() => weekSales.filter(s => s.created >= today), [weekSales, today]);
  const totalHoy   = useMemo(() => todaySales.reduce((s,x) => s + x.total, 0), [todaySales]);
  const totalSem   = useMemo(() => weekSales.reduce((s,x) => s + x.total, 0), [weekSales]);

  // ── Bar chart data ─────────────────────────────────────────────────────────
  const bars = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0);
      const end = new Date(d.getTime()); end.setDate(end.getDate() + 1);
      const ds = weekSales.filter(s => s.created >= d.getTime() && s.created < end.getTime());
      const total = ds.reduce((s,x) => s + x.total, 0);
      return { label: d.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0,3), total, count: ds.length };
    });
  }, [weekSales]);

  const maxTotal = Math.max(...bars.map(b => b.total), 1);

  // ── Top products ───────────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { qty:number; total:number }> = {};
    for (const sale of weekSales) {
      for (const item of sale.items) {
        if (!map[item.name]) map[item.name] = { qty: 0, total: 0 };
        map[item.name].qty   += item.qty;
        map[item.name].total += item.price * item.qty;
      }
    }
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a,b) => b.qty - a.qty).slice(0, 5);
  }, [weekSales]);

  // ── Revenue by payment method ───────────────────────────────────────────────
  const byPayment = useMemo(() => {
    const m = { cash: 0, transfer: 0, card: 0 };
    for (const s of weekSales) m[s.payMethod] = (m[s.payMethod] || 0) + s.total;
    return [
      { label: '💵 Efectivo',      key: 'cash',     val: m.cash },
      { label: '📱 Transferencia', key: 'transfer', val: m.transfer },
      { label: '💳 Tarjeta',       key: 'card',     val: m.card },
    ].filter(x => x.val > 0);
  }, [weekSales]);

  // ── Employee stats ──────────────────────────────────────────────────────────
  const byEmployee = useMemo(() => {
    const m: Record<string, { count:number; total:number }> = {};
    for (const s of weekSales) {
      const key = s.employee || 'Dueño';
      if (!m[key]) m[key] = { count: 0, total: 0 };
      m[key].count++; m[key].total += s.total;
    }
    return Object.entries(m).sort((a,b) => b[1].total - a[1].total);
  }, [weekSales]);

  const card = (label:string, value:React.ReactNode) => (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
      <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, fontFamily:'monospace', paddingTop:2 }}>{value}</div>
    </div>
  );

  return (
    <IonContent style={{ '--background':'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding:14, maxWidth:520, margin:'0 auto', paddingBottom:80 }}>
        <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>📊 Reportes</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Últimos 7 días</p>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
          {card('Ventas hoy',     todaySales.length)}
          {card('Total hoy',      formatMoney(totalHoy))}
          {card('Ventas semana',  weekSales.length)}
          {card('Total semana',   formatMoney(totalSem))}
        </div>

        {/* Bar chart */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Ventas por día</div>
          {bars.map((b,i) => {
            const pct    = Math.round((b.total / maxTotal) * 100);
            const inside = pct > 35;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ fontSize:11, color:'var(--text2)', width:32, textAlign:'right', flexShrink:0 }}>{b.label}</div>
                <div style={{ flex:1, background:'var(--surface3)', borderRadius:99, height:22, overflow:'hidden', position:'relative' }}>
                  <div style={{ height:'100%', background: b.count > 0 ? 'var(--blue)' : 'transparent', borderRadius:99, width:`${Math.max(pct, 2)}%`, display:'flex', alignItems:'center', paddingLeft:8 }}>
                    {inside && b.count > 0 && <span style={{ fontSize:11, color:'#fff', whiteSpace:'nowrap', fontWeight:600 }}>{formatMoney(b.total)}</span>}
                  </div>
                  {!inside && b.total > 0 && (
                    <span style={{ position:'absolute', left:`${Math.max(pct, 4) + 1}%`, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text2)', whiteSpace:'nowrap' }}>
                      {formatMoney(b.total)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment breakdown */}
        {byPayment.length > 0 && totalSem > 0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Por método de pago</div>
            {byPayment.map(p => {
              const pct = totalSem > 0 ? Math.round((p.val / totalSem) * 100) : 0;
              return (
                <div key={p.key} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                    <span>{p.label}</span>
                    <span style={{ fontFamily:'monospace', fontWeight:600 }}>
                      {formatMoney(p.val)} <span style={{ color:'var(--text3)' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height:6, background:'var(--surface3)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'var(--blue)', borderRadius:99, transition:'width .4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Employee stats */}
        {byEmployee.length > 1 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Por empleado</div>
            {byEmployee.map(([name, st], i) => (
              <div key={name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom: i < byEmployee.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ background:'var(--accent-bg)', color:'var(--accent)', borderRadius:99, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{name}</span>
                  <span style={{ fontSize:12, color:'var(--text3)' }}>{st.count} ventas</span>
                </div>
                <span style={{ fontFamily:'monospace', fontWeight:600 }}>{formatMoney(st.total)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top products */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Top 5 productos</div>
          {topProducts.length === 0 ? (
            <div style={{ color:'var(--text2)', fontSize:13, padding:12, textAlign:'center' }}>Sin ventas esta semana</div>
          ) : topProducts.map((p, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--blue-bg)', color:'var(--blue)', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i + 1}</div>
                <div style={{ fontSize:14, marginLeft:10 }}>{p.name}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, color:'var(--text2)' }}>{p.qty} unid.</span>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--ok-dark)', fontFamily:'monospace' }}>{formatMoney(p.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </IonContent>
  );
};

export default ReportesPage;
