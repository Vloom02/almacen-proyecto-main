import React, { useState, useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { useStore, formatMoney, EMPLOYEES } from '../context/StoreContext';
import { Sale, HistoryFilters } from '../types';

// Sentinela usado en el <option> para representar "ventas sin empleado" (Dueño).
const OWNER_TOKEN = '__owner__';

// ─── Sale card ────────────────────────────────────────────────────────────────
const SaleCard: React.FC<{ sale: Sale }> = ({ sale }) => {
  const [open, setOpen] = useState(false);
  const time = new Date(sale.created).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  const itemCount = sale.items.reduce((s,i) => s+i.qty, 0);
  const payLabel = sale.payMethod==='transfer'?'📱 Transferencia':sale.payMethod==='card'?'💳 Tarjeta':'💵 Efectivo';

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:7 }}>
      <div onClick={()=>setOpen(!open)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', cursor:'pointer' }}>
        <div>
          <div style={{ fontSize:12, color:'var(--text2)', display:'flex', alignItems:'center', gap:6 }}>
            🕐 {time}
            <span style={{ background:'var(--accent-bg)', color:'var(--accent)', borderRadius:99, padding:'1px 7px', fontSize:10, fontWeight:600 }}>
              {sale.employee || 'Dueño'}
            </span>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
            {itemCount} item{itemCount!==1?'s':''} {sale.customer?`• ${sale.customer}`:''}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16, fontWeight:800, color:'var(--ok-dark)', fontFamily:'monospace' }}>{formatMoney(sale.total)}</span>
          <span style={{ color:'var(--text3)', fontSize:18, transition:'transform .2s', transform:open?'rotate(90deg)':'' }}>›</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', background:'var(--surface2)' }}>
          {sale.items.map((item,j) => (
            <div key={j} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0' }}>
              <span>{item.name} <span style={{ color:'var(--text3)' }}>x{item.qty}</span></span>
              <span style={{ fontFamily:'monospace' }}>{formatMoney(item.price*item.qty)}</span>
            </div>
          ))}
          {sale.discount>0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'3px 0', color:'var(--ok-dark)' }}>
              <span>Descuento</span><span style={{ fontFamily:'monospace' }}>-{formatMoney(sale.discount)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, borderTop:'1px dashed var(--border)', marginTop:4, paddingTop:6 }}>
            <span>Total</span><span style={{ fontFamily:'monospace' }}>{formatMoney(sale.total)}</span>
          </div>

          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
            {payLabel}{sale.customer?` — ${sale.customer}`:''}{sale.fiado?' (Fiado)':''}
          </div>

          {sale.stockMovements && sale.stockMovements.length > 0 && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:'1px dashed var(--border)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', marginBottom:4 }}>Movimientos de stock:</div>
              {sale.stockMovements.map((mv,k) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)', padding:'2px 0' }}>
                  <span style={{ color:'var(--danger)', fontWeight:700 }}>-{mv.deducted}</span>
                  <span>{mv.name}</span>
                  <span style={{ color:'var(--text3)' }}>{mv.before}→{mv.after}</span>
                  {mv.deducted < mv.requested && (
                    <span style={{ color:'var(--warn)', fontSize:11 }}>(solo {mv.deducted} disponibles)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main HistorialPage ────────────────────────────────────────────────────────
const HistorialPage: React.FC = () => {
  const { state } = useStore();
  const employees = EMPLOYEES();

  const defaultFilters: HistoryFilters = {
    employee:'', payMethod:'', customer:'', dateFrom:'', dateTo:'',
  };
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  const setF = (k: keyof HistoryFilters, v: string) =>
    setFilters(f => ({ ...f, [k]: v }));

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filtered = useMemo(() => {
    return state.sales
      .filter(s => s.created >= weekAgo)
      .filter(s => {
        if (!filters.employee) return true;
        // Sentinela __owner__ matchea ventas sin empleado asignado.
        if (filters.employee === OWNER_TOKEN) return !s.employee;
        return s.employee === filters.employee;
      })
      .filter(s => !filters.payMethod || s.payMethod === filters.payMethod)
      .filter(s => !filters.customer  || (s.customer||'').toLowerCase().includes(filters.customer.toLowerCase()))
      .filter(s => {
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom + 'T00:00:00').getTime();
          if (s.created < from) return false;
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo + 'T23:59:59.999').getTime();
          if (s.created > to) return false;
        }
        return true;
      })
      .sort((a,b) => b.created - a.created);
  }, [state.sales, filters, weekAgo]);

  const totalWeek     = useMemo(() => filtered.reduce((s,x) => s+x.total, 0), [filtered]);
  const activeFilters = Object.values(filters).filter(v => v !== '').length;

  const grouped = useMemo(() => {
    const g: Record<string, Sale[]> = {};
    for (const s of filtered) {
      const key = new Date(s.created).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
      if (!g[key]) g[key] = [];
      g[key].push(s);
    }
    return g;
  }, [filtered]);

  const employeeStats = useMemo(() => {
    const stats: Record<string,{count:number;total:number}> = {};
    for (const s of filtered) {
      const key = s.employee || 'Dueño';
      if (!stats[key]) stats[key] = {count:0,total:0};
      stats[key].count++;
      stats[key].total += s.total;
    }
    return Object.entries(stats).sort((a,b) => b[1].total - a[1].total);
  }, [filtered]);

  const exportCSV = () => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    let csv = '\uFEFFFecha,Hora,Empleado,Cliente,Pago,Descuento,Total,Productos\n';
    for (const s of filtered) {
      const d = new Date(s.created);
      const date = d.toLocaleDateString('es-AR');
      const time = d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
      const prods = s.items.map(i => `${i.name} x${i.qty}`).join(' | ');
      const pay = s.payMethod==='transfer'?'Transferencia':s.payMethod==='card'?'Tarjeta':'Efectivo';
      csv += [date, time, s.employee||'Dueño', s.customer||'', pay, formatMoney(s.discount||0), formatMoney(s.total), prods]
        .map(escape).join(',') + '\n';
    }
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const inputBase: React.CSSProperties = {
    width:'100%', border:'1px solid var(--border)', borderRadius:8,
    padding:9, fontSize:13, background:'var(--surface)', color:'var(--text)', outline:'none',
  };

  return (
    <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
      <div style={{ padding:14, maxWidth:520, margin:'0 auto', paddingBottom:80 }}>
        <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>📋 Historial</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Ventas de los últimos 7 días</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>Ventas</div>
            <div style={{ fontSize:20, fontWeight:700 }}>{filtered.length}</div>
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>Total</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:'monospace', paddingTop:3 }}>{formatMoney(totalWeek)}</div>
          </div>
        </div>

        {employeeStats.length > 1 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:12, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:8 }}>Por empleado</div>
            {employeeStats.map(([name,st]) => (
              <div key={name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ background:'var(--accent-bg)', color:'var(--accent)', borderRadius:99, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{name}</span>
                  <span style={{ color:'var(--text3)' }}>{st.count} ventas</span>
                </span>
                <span style={{ fontFamily:'monospace', fontWeight:600 }}>{formatMoney(st.total)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background:'var(--warn-bg)', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--warn)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          🗑 Historial se borra automáticamente cada 7 días
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button type="button" onClick={exportCSV}
            disabled={filtered.length === 0}
            style={{ flex:1, padding:11, border:'none', borderRadius:12, fontSize:14, fontWeight:600, cursor: filtered.length===0?'default':'pointer', background:'var(--surface2)', color:'var(--text)', fontFamily:'inherit', opacity: filtered.length===0?.5:1 }}>
            📊 Exportar CSV
          </button>
          <button type="button" onClick={()=>setShowFilters(!showFilters)}
            style={{ flex:1, padding:11, border:`1px solid ${activeFilters>0?'var(--blue)':'var(--border)'}`, borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', background:activeFilters>0?'var(--blue-bg)':'var(--surface)', color:activeFilters>0?'var(--blue)':'var(--text)', fontFamily:'inherit' }}>
            🔍 Filtros {activeFilters>0?`(${activeFilters})`:''}
          </button>
        </div>

        {showFilters && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:8 }}>
              <div>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Empleado</label>
                <select value={filters.employee} onChange={e=>setF('employee',e.target.value)} style={{ ...inputBase }}>
                  <option value="">Todos</option>
                  <option value={OWNER_TOKEN}>Dueño</option>
                  {employees.map((e,i) => <option key={i} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Método de pago</label>
                <select value={filters.payMethod} onChange={e=>setF('payMethod',e.target.value)} style={{ ...inputBase }}>
                  <option value="">Todos</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Desde</label>
                <input type="date" value={filters.dateFrom} onChange={e=>setF('dateFrom',e.target.value)} style={{ ...inputBase }} />
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Hasta</label>
                <input type="date" value={filters.dateTo} onChange={e=>setF('dateTo',e.target.value)} style={{ ...inputBase }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:4 }}>Cliente</label>
              <input type="text" value={filters.customer} onChange={e=>setF('customer',e.target.value)} placeholder="Buscar por cliente..." style={{ ...inputBase }} />
            </div>
            <button type="button" onClick={()=>setFilters(defaultFilters)}
              style={{ marginTop:8, width:'100%', padding:9, border:'none', borderRadius:8, background:'var(--surface2)', color:'var(--text2)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Limpiar filtros
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text2)' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📋</div>
            <div>{activeFilters>0?'Sin resultados para los filtros aplicados':'No hay ventas esta semana'}</div>
          </div>
        ) : (
          Object.entries(grouped).map(([day,sales]) => {
            const dayTotal = sales.reduce((s,x)=>s+x.total,0);
            return (
              <div key={day} style={{ marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.6 }}>{day}</span>
                  <div style={{ flex:1, height:1, background:'var(--border)' }} />
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--ok-dark)' }}>{formatMoney(dayTotal)}</span>
                </div>
                {sales.map((sale,i) => <SaleCard key={sale.id ?? i} sale={sale} />)}
              </div>
            );
          })
        )}
      </div>
    </IonContent>
  );
};

export default HistorialPage;
