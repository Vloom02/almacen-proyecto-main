import React, { useState, useMemo } from 'react';
import { IonContent, IonToast, IonModal } from '@ionic/react';
import { useStore, formatMoney, STOCK_THRESHOLD, CATEGORIES, PLAN_LEVEL } from '../context/StoreContext';
import { Producto, Role } from '../types';

interface Props { currentRole: Role; onRequirePin: (cb: () => void) => void; }

const inputBase: React.CSSProperties = {
  width:'100%', border:'1px solid var(--border)', borderRadius:8,
  padding:11, fontSize:15, background:'var(--surface)', color:'var(--text)', outline:'none',
};

const Btn = ({ children, onClick, color='blue', disabled=false }: { children: React.ReactNode; onClick?: () => void; color?: 'blue'|'green'|'gray'; disabled?: boolean }) => {
  const bg = color==='blue'?'var(--blue)':color==='green'?'var(--ok)':'var(--surface2)';
  const fg = color==='gray'?'var(--text)':'#fff';
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width:'100%', padding:13, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:disabled?'default':'pointer', background:bg, color:fg, fontFamily:'inherit', marginTop:8, opacity:disabled?.5:1 }}>
      {children}
    </button>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label style={{ display:'block', fontSize:13, color:'var(--text2)', marginBottom:5, marginTop:12 }}>{children}</label>
);

const StockPage: React.FC<Props> = ({ currentRole, onRequirePin }) => {
  const { state, addProduct, updateProduct, deleteProduct } = useStore();
  const [search, setSearch]   = useState('');
  const [activeCat, setCat]   = useState('Todos');
  const [toast, setToast]     = useState({ show:false, msg:'', type:'ok' as 'ok'|'warn'|'err' });
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRS, setShowRS]   = useState(false);
  const [rsP, setRsP]         = useState<Producto | null>(null);
  const [rsAmt, setRsAmt]     = useState('');

  // Add form
  const [aName, setAName]     = useState(''); const [aBarcode, setABarcode] = useState('');
  const [aCat,  setACat]      = useState(''); const [aPrice,   setAPrice]   = useState('');
  const [aStock, setAStock]   = useState('');
  // Edit form
  const [eName, setEName]     = useState(''); const [eBarcode, setEBarcode] = useState('');
  const [eCat,  setECat]      = useState(''); const [ePrice,   setEPrice]   = useState('');
  const [eStock, setEStock]   = useState(''); const [eId,      setEId]      = useState<number | null>(null);

  const threshold = STOCK_THRESHOLD();
  const planLevel = PLAN_LEVEL();
  const categories = CATEGORIES();

  const toast$ = (msg: string, type: 'ok'|'warn'|'err' = 'ok') => setToast({ show:true, msg, type });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.productos
      .filter(p => {
        const ms = !q || p.nombre.toLowerCase().includes(q) || p.barcode.includes(search.trim());
        const mc = planLevel < 2 || activeCat === 'Todos' || p.categoria === activeCat;
        return ms && mc;
      })
      .sort((a,b) => a.stock - b.stock);
  }, [state.productos, search, activeCat, planLevel]);

  const stats = useMemo(() => ({
    total: state.productos.length,
    units: state.productos.reduce((s,p) => s + p.stock, 0),
    low:   state.productos.filter(p => p.stock <= threshold && p.stock > 0).length,
    empty: state.productos.filter(p => p.stock === 0).length,
  }), [state.productos, threshold]);

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const name    = aName.trim();
    const barcode = aBarcode.trim();
    if (!name || !barcode) { toast$('Completá nombre y código.', 'warn'); return; }
    if (state.productos.some(p => p.barcode === barcode)) {
      toast$('Ya existe un producto con ese código.', 'warn'); return;
    }
    const price = parseFloat(aPrice) || 0;
    const stock = parseInt(aStock, 10) || 0;
    if (price < 0 || stock < 0) { toast$('Precio y stock no pueden ser negativos.', 'warn'); return; }

    await addProduct({ nombre: name, barcode, categoria: aCat, price, stock });
    toast$(`"${name}" agregado.`, 'ok');
    setShowAdd(false);
    setAName(''); setABarcode(''); setACat(''); setAPrice(''); setAStock('');
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (p: Producto) => onRequirePin(() => {
    setEId(p.id!); setEName(p.nombre); setEBarcode(p.barcode);
    setECat(p.categoria || ''); setEPrice(p.price?.toString() || ''); setEStock(p.stock?.toString() || '');
    setShowEdit(true);
  });

  const handleEdit = async () => {
    const name    = eName.trim();
    const barcode = eBarcode.trim();
    if (!name || !barcode || eId === null) return;
    const duplicate = state.productos.find(p => p.barcode === barcode && p.id !== eId);
    if (duplicate) { toast$('Ese código ya lo tiene otro producto.', 'warn'); return; }
    const price = parseFloat(ePrice) || 0;
    const stock = parseInt(eStock, 10) || 0;
    if (price < 0 || stock < 0) { toast$('Precio y stock no pueden ser negativos.', 'warn'); return; }

    await updateProduct({ id: eId, nombre: name, barcode, categoria: eCat, price, stock });
    toast$(`"${name}" actualizado.`, 'ok');
    setShowEdit(false);
  };

  // ── Restock ────────────────────────────────────────────────────────────────
  const openRestock = (p: Producto) => onRequirePin(() => { setRsP(p); setRsAmt(''); setShowRS(true); });

  const handleRestock = async () => {
    if (!rsP) return;
    const amt = parseInt(rsAmt, 10);
    if (!Number.isFinite(amt) || amt <= 0) { toast$('Ingresá una cantidad válida.', 'warn'); return; }
    await updateProduct({ ...rsP, stock: rsP.stock + amt });
    toast$(`"${rsP.nombre}" → ${rsP.stock + amt} unid.`, 'ok');
    setShowRS(false); setRsP(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (p: Producto) => onRequirePin(async () => {
    if (!confirm(`Eliminar "${p.nombre}"?`)) return;
    await deleteProduct(p.id!);
    toast$(`"${p.nombre}" eliminado.`, 'ok');
  });

  const sc = (stock: number) => ({
    border: stock === 0 ? 'var(--danger)' : stock <= threshold ? '#fde68a' : 'var(--border)',
    badge:  stock === 0 ? 'var(--danger)' : stock <= threshold ? 'var(--warn)' : 'var(--ok)',
  });

  const iconBtn = (onClick: () => void, icon: string, color: string, ariaLabel: string) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel}
      style={{ width:34, height:34, border:'1px solid var(--border)', borderRadius:8, background:'none', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', color }}>
      {icon}
    </button>
  );

  const modalInput = (label: string, value: string, onChange: (v: string) => void, opts: { type?: string; placeholder?: string; mono?: boolean; hint?: string; inputMode?: 'numeric'|'decimal'|'text' } = {}) => (
    <>
      <Label>{label}</Label>
      <input type={opts.type || 'text'} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={opts.placeholder} inputMode={opts.inputMode}
        style={{ ...inputBase, fontFamily: opts.mono ? '"Courier New",monospace' : 'inherit', marginBottom: opts.hint ? 4 : 10 }} />
      {opts.hint && <p style={{ fontSize:11, color:'var(--text3)', marginTop:2, marginBottom:10 }}>{opts.hint}</p>}
    </>
  );

  const modalCatSelect = (value: string, onChange: (v: string) => void) => planLevel >= 2 && (
    <>
      <Label>Categoría</Label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ ...inputBase, marginBottom:10 }}>
        <option value="">Sin categoría</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </>
  );

  return (
    <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
      <div style={{ padding:14, maxWidth:520, margin:'0 auto', paddingBottom:80 }}>
        <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>📦 Stock</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Productos, precios y cantidades</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {([
            ['Productos', stats.total, ''],
            ['Unidades',  stats.units, ''],
            ['Stock bajo', stats.low,  stats.low > 0 ? 'var(--warn)' : 'var(--ok)'],
          ] as const).map(([l, v, c]) => (
            <div key={l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:10 }}>
              <div style={{ fontSize:11, color:'var(--text2)', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:700, color: c || 'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>

        {(stats.low > 0 || stats.empty > 0) && (
          <div style={{ background:'var(--warn-bg)', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--warn)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            ⚠️ {stats.empty > 0 ? `${stats.empty} sin stock` : ''}{stats.empty > 0 && stats.low > 0 ? ', ' : ''}{stats.low > 0 ? `${stats.low} con stock bajo` : ''}
          </div>
        )}

        <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..." style={{ ...inputBase, marginBottom:8 }} />

        {planLevel >= 2 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {['Todos', ...categories].map(cat => (
              <button type="button" key={cat} onClick={()=>setCat(cat)}
                style={{ padding:'5px 12px', borderRadius:99, fontSize:12, fontWeight:500, border:`1px solid ${activeCat===cat?'var(--blue)':'var(--border)'}`, background:activeCat===cat?'var(--blue-bg)':'var(--surface)', color:activeCat===cat?'var(--blue)':'var(--text2)', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', marginBottom:14 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text2)' }}>
              <div style={{ fontSize:44, marginBottom:10 }}>📦</div>
              <div>{state.productos.length === 0 ? 'No hay productos. ¡Agregá uno!' : 'Sin resultados.'}</div>
            </div>
          ) : filtered.map(p => {
            const s = sc(p.stock);
            return (
              <div key={p.id} style={{ background:'var(--surface)', border:`1px solid ${s.border}`, borderRadius:12, padding:'11px 12px', display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace', marginTop:1 }}>{p.barcode || '—'}</div>
                  {planLevel >= 2 && p.categoria && <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>📁 {p.categoria}</div>}
                  <div style={{ fontSize:13, color:'var(--accent)', fontWeight:600, marginTop:2 }}>{formatMoney(p.price || 0)}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <span style={{ fontSize:19, fontWeight:800, minWidth:28, textAlign:'right', color:s.badge }}>{p.stock}</span>
                  {currentRole === 'owner' && <>
                    {iconBtn(()=>openRestock(p), '+', 'var(--ok)', `Reponer ${p.nombre}`)}
                    {iconBtn(()=>openEdit(p),    '✏️', 'var(--blue)', `Editar ${p.nombre}`)}
                    {iconBtn(()=>handleDelete(p),'✕', 'var(--danger)', `Eliminar ${p.nombre}`)}
                  </>}
                </div>
              </div>
            );
          })}
        </div>

        {currentRole === 'owner' && (
          <button type="button"
            onClick={() => { setAName(''); setABarcode(''); setACat(''); setAPrice(''); setAStock(''); setShowAdd(true); }}
            style={{ width:'100%', padding:13, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', background:'var(--blue)', color:'#fff', fontFamily:'inherit' }}>
            + Agregar producto
          </button>
        )}
      </div>

      {/* ── Add modal ───────────────────────────────────────────────────────── */}
      <IonModal isOpen={showAdd} onDidDismiss={()=>setShowAdd(false)}>
        <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
          <div style={{ padding:14, maxWidth:520, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <button type="button" onClick={()=>setShowAdd(false)}
                style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'var(--text)', padding:0 }}>←</button>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Nuevo producto</h2>
            </div>
            {modalInput('Nombre *', aName, setAName, { placeholder:'Ej: Gaseosa 500ml' })}
            {modalInput('Código de barras *', aBarcode, setABarcode, { mono:true, placeholder:'Escaneá o escribí el código', hint:'Tocá este campo y escaneá con el lector' })}
            {modalCatSelect(aCat, setACat)}
            {modalInput('Precio de venta ($) *', aPrice, setAPrice, { type:'number', inputMode:'decimal', placeholder:'Ej: 1250.50' })}
            {modalInput('Stock inicial', aStock, setAStock, { type:'number', inputMode:'numeric', placeholder:'0' })}
            <Btn onClick={handleAdd}>Guardar producto</Btn>
            <Btn onClick={()=>setShowAdd(false)} color="gray">Cancelar</Btn>
          </div>
        </IonContent>
      </IonModal>

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      <IonModal isOpen={showEdit} onDidDismiss={()=>setShowEdit(false)}>
        <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
          <div style={{ padding:14, maxWidth:520, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <button type="button" onClick={()=>setShowEdit(false)}
                style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'var(--text)', padding:0 }}>←</button>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Editar producto</h2>
            </div>
            {modalInput('Nombre *', eName, setEName)}
            {modalInput('Código de barras *', eBarcode, setEBarcode, { mono:true })}
            {modalCatSelect(eCat, setECat)}
            {modalInput('Precio ($)', ePrice, setEPrice, { type:'number', inputMode:'decimal' })}
            {modalInput('Stock actual', eStock, setEStock, { type:'number', inputMode:'numeric', hint:'Podés editar el stock directamente aquí' })}
            <Btn onClick={handleEdit}>Guardar cambios</Btn>
            <Btn onClick={()=>setShowEdit(false)} color="gray">Cancelar</Btn>
          </div>
        </IonContent>
      </IonModal>

      {/* ── Restock modal ───────────────────────────────────────────────────── */}
      <IonModal isOpen={showRS} onDidDismiss={()=>setShowRS(false)}>
        <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
          <div style={{ padding:14, maxWidth:520, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <button type="button" onClick={()=>setShowRS(false)}
                style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'var(--text)', padding:0 }}>←</button>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Reponer stock</h2>
            </div>
            {rsP && (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:16 }}>
                <div style={{ fontWeight:600, fontSize:16 }}>{rsP.nombre}</div>
                <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace', marginTop:2 }}>{rsP.barcode}</div>
                <div style={{ marginTop:8, display:'flex', gap:16 }}>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>Stock: <strong style={{ color:'var(--ok)' }}>{rsP.stock} unid.</strong></span>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>Precio: <strong style={{ color:'var(--accent)' }}>{formatMoney(rsP.price || 0)}</strong></span>
                </div>
              </div>
            )}
            <Label>¿Cuántas unidades agregás?</Label>
            <input type="number" inputMode="numeric" value={rsAmt} onChange={e=>setRsAmt(e.target.value)}
              placeholder="Ej: 12" min="1"
              style={{ ...inputBase, fontSize:22, textAlign:'center' }} />
            {rsP && !isNaN(parseInt(rsAmt, 10)) && parseInt(rsAmt, 10) > 0 && (
              <div style={{ background:'var(--ok-bg)', border:'1px solid #a7f3c9', borderRadius:8, padding:'10px 14px', fontSize:14, color:'var(--ok-dark)', marginTop:8 }}>
                Stock nuevo: <strong>{rsP.stock + parseInt(rsAmt, 10)} unid.</strong>
              </div>
            )}
            <Btn onClick={handleRestock} color="green">✓ Confirmar reposición</Btn>
            <Btn onClick={()=>setShowRS(false)} color="gray">Cancelar</Btn>
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={toast.show}
        onDidDismiss={()=>setToast(t=>({...t, show:false}))}
        message={toast.msg}
        duration={3500}
        position="top"
        color={toast.type==='ok'?'success':toast.type==='warn'?'warning':'danger'}
      />
    </IonContent>
  );
};

export default StockPage;
