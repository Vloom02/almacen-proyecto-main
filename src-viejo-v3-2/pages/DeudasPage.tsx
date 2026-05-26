import React, { useState, useMemo } from 'react';
import { IonContent, IonToast } from '@ionic/react';
import { useStore, formatMoney } from '../context/StoreContext';

const DeudasPage: React.FC = () => {
  const { state, deleteDebt } = useStore();
  const [search, setSearch]   = useState('');
  const [toast, setToast]     = useState({ show:false, msg:'', type:'ok' as 'ok'|'warn' });

  const toast$ = (msg:string, type:'ok'|'warn'='ok') => setToast({ show:true, msg, type });

  const filtered = useMemo(() =>
    state.debts
      .filter(d => !search || d.customer.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => b.created - a.created),
    [state.debts, search]
  );

  const total = useMemo(() => state.debts.reduce((s,d) => s + d.amount, 0), [state.debts]);

  const handlePay = async (id:number, customer:string) => {
    if (!confirm(`Marcar deuda de "${customer}" como pagada?`)) return;
    await deleteDebt(id);
    toast$(`"${customer}" pagó su deuda.`, 'ok');
  };

  const handleDelete = async (id:number) => {
    if (!confirm('Eliminar esta deuda?')) return;
    await deleteDebt(id);
  };

  const iconBtn = (onClick:()=>void, icon:string, color:string, title:string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{ width:34, height:34, border:'1px solid var(--border)', borderRadius:8, background:'none', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', color }}
    >
      {icon}
    </button>
  );

  return (
    <IonContent style={{ '--background':'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding:14, maxWidth:520, margin:'0 auto', paddingBottom:80 }}>
        <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>📒 Deudas</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Registro de clientes con saldo pendiente</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>Clientes con deuda</div>
            <div style={{ fontSize:20, fontWeight:700 }}>{state.debts.length}</div>
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>Total adeudado</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:'monospace', paddingTop:3, color:'var(--danger)' }}>{formatMoney(total)}</div>
          </div>
        </div>

        {state.debts.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            aria-label="Buscar cliente"
            style={{ width:'100%', border:'1px solid var(--border)', borderRadius:8, padding:11, fontSize:15, background:'var(--surface)', color:'var(--text)', outline:'none', marginBottom:12 }}
          />
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text2)' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📒</div>
            <div>{state.debts.length===0 ? 'No hay deudas registradas' : 'Sin resultados para esa búsqueda'}</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(debt => {
              const itemsStr = debt.items.map(i => `${i.name} x${i.qty}`).join(', ');
              return (
                <div key={debt.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:15 }}>👤 {debt.customer}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                        {new Date(debt.created).toLocaleString('es-AR', { dateStyle:'short', timeStyle:'short' })}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontWeight:800, fontSize:16, color:'var(--danger)', fontFamily:'monospace' }}>{formatMoney(debt.amount)}</span>
                      {iconBtn(() => handlePay(debt.id!, debt.customer), '✓', 'var(--ok)', 'Marcar como pagado')}
                      {iconBtn(() => handleDelete(debt.id!), '✕', 'var(--danger)', 'Eliminar')}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:8, paddingTop:8, borderTop:'1px dashed var(--border)' }}>
                    {itemsStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <IonToast
        isOpen={toast.show}
        onDidDismiss={() => setToast(t => ({ ...t, show:false }))}
        message={toast.msg}
        duration={3500}
        position="top"
        color={toast.type === 'ok' ? 'success' : 'warning'}
      />
    </IonContent>
  );
};

export default DeudasPage;
