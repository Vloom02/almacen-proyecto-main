import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonContent, IonToast, IonModal } from '@ionic/react';
import { useStore, formatMoney, STORE_NAME } from '../context/StoreContext';
import { Role } from '../types';

interface CartItem {
  id: number; name: string; barcode: string; price: number; qty: number;
}

interface VentaPageProps {
  currentRole: Role;
  currentEmployee: string | null;
  onRoleBadgeClick: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

const payLabel = (m: string) =>
  m === 'transfer' ? '📱 Transfer.' : m === 'card' ? '💳 Tarjeta' : '💵 Efectivo';

const VentaPage: React.FC<VentaPageProps> = ({ currentRole, currentEmployee, onRoleBadgeClick, onThemeToggle, isDark }) => {
  const { state, getProductByBarcode, executeSale, addDebt } = useStore();

  const [cart, setCart]               = useState<CartItem[]>([]);
  const [scanInput, setScanInput]     = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [discountVal, setDiscountVal] = useState('');
  const [discountType, setDiscType]   = useState<'pct'|'fixed'>('pct');
  const [customer, setCustomer]       = useState('');
  const [payMethod, setPayMethod]     = useState<'cash'|'transfer'|'card'>('cash');
  const [isFiado, setIsFiado]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [toast, setToast]             = useState({ show:false, msg:'', type:'ok' as 'ok'|'warn'|'err' });
  const [time, setTime]               = useState(() => new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}));
  const scanRef = useRef<HTMLInputElement>(null);

  // Reloj minuto a minuto
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})), 60000);
    return () => clearInterval(t);
  }, []);

  // Foco inicial en el scanner
  useEffect(() => {
    const t = setTimeout(() => scanRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const toast$ = (msg: string, type: 'ok'|'warn'|'err' = 'ok') => setToast({ show:true, msg, type });

  // ── Cart ────────────────────────────────────────────────────────────────────
  const addToCart = useCallback((barcode: string) => {
    const p = getProductByBarcode(barcode);
    if (!p)            { toast$(`Código no encontrado: ${barcode}`, 'err'); return; }
    if (p.stock === 0) { toast$(`${p.nombre} — ¡Sin stock!`, 'warn'); return; }
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id!);
      if (ex) {
        if (ex.qty >= p.stock) { toast$(`${p.nombre} — Stock máximo: ${p.stock}`, 'warn'); return prev; }
        return prev.map(c => c.id === p.id! ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: p.id!, name: p.nombre, barcode: p.barcode, price: p.price, qty: 1 }];
    });
    toast$(`${p.nombre} agregado`, 'ok');
  }, [getProductByBarcode]);

  const addToCartById = (id: number) => {
    const p = state.productos.find(x => x.id === id);
    if (p) addToCart(p.barcode);
    setSearchQuery('');
  };

  const updateQty = (id: number, delta: number) => {
    const p = state.productos.find(x => x.id === id);
    setCart(prev => {
      const item = prev.find(c => c.id === id);
      if (!item || !p) return prev;
      if (delta > 0 && item.qty >= p.stock) { toast$(`Stock máximo: ${p.stock}`, 'warn'); return prev; }
      const next = item.qty + delta;
      if (next <= 0) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, qty: next } : c);
    });
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.id !== id));

  const cancelSale = () => {
    if (cart.length > 0 && !confirm('¿Vaciar el carrito?')) return;
    setCart([]); setDiscountVal(''); setCustomer('');
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s,c) => s + c.price * c.qty, 0);
  const discount = (() => {
    const v = parseFloat(discountVal) || 0;
    if (v <= 0) return 0;
    return discountType === 'pct' ? Math.min(subtotal, subtotal * v / 100) : Math.min(subtotal, v);
  })();
  const total = Math.max(0, subtotal - discount);
  const totalItems = cart.reduce((s,c) => s + c.qty, 0);

  // ── Búsqueda manual ──────────────────────────────────────────────────────────
  const searchResults = searchQuery.length > 1
    ? state.productos.filter(p =>
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery)
      ).slice(0, 6)
    : [];

  // ── Ejecutar venta (atómica) ─────────────────────────────────────────────────
  const handleExecuteSale = async () => {
    if (cart.length === 0 || processing) return;
    if (isFiado && !customer.trim()) {
      toast$('Para registrar fiado necesitás el nombre del cliente.', 'warn');
      return;
    }
    setProcessing(true);
    try {
      const sale = await executeSale(cart, {
        total, discount, payMethod, customer: customer.trim(),
        fiado: isFiado, employee: currentRole === 'employee' ? (currentEmployee ?? null) : null,
        created: Date.now(),
      });
      if (isFiado && customer.trim()) {
        await addDebt({
          customer: customer.trim(),
          amount: total,
          items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
          created: Date.now(),
        });
      }
      // Reset state
      setCart([]); setDiscountVal(''); setCustomer(''); setIsFiado(false);
      setShowConfirm(false);
      toast$('✅ Venta confirmada!', 'ok');
      // Re-foco al scanner
      setTimeout(() => scanRef.current?.focus(), 200);
      // sale es Sale (no necesitamos hacer nada con él aquí)
      void sale;
    } catch (err) {
      toast$('Error al procesar la venta: ' + (err instanceof Error ? err.message : String(err)), 'err');
    }
    setProcessing(false);
  };

  const isOwner = currentRole === 'owner';
  const empLabel = isOwner ? '👤 Dueño' : `🧑‍💼 ${currentEmployee || 'Empleado'}`;

  const inputBase: React.CSSProperties = {
    width:'100%', border:'1px solid var(--border)', borderRadius:8,
    padding:11, fontSize:15, background:'var(--surface)', color:'var(--text)', outline:'none',
  };

  return (
    <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
      <div style={{ padding:14, maxWidth:520, margin:'0 auto', paddingBottom:80 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700 }}>🛒 {STORE_NAME()}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>{time}</span>
              <button type="button" onClick={onRoleBadgeClick} style={{
                display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px',
                borderRadius:99, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit',
                background:isOwner?'var(--blue-bg)':'var(--ok-bg)',
                color:isOwner?'var(--blue)':'var(--ok-dark)',
              }}>{empLabel} 🔄</button>
            </div>
          </div>
          <button type="button" onClick={onThemeToggle}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{ width:46, height:26, borderRadius:99, background:isDark?'#3b3f5c':'var(--surface3)', border:'1px solid var(--border)', position:'relative', cursor:'pointer' }}>
            <div style={{ position:'absolute', top:3, left:isDark?23:3, width:18, height:18, borderRadius:'50%', background:isDark?'#c7d2fe':'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.25)', transition:'left .25s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>
              {isDark?'🌙':'☀️'}
            </div>
          </button>
        </div>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>Escaneá o buscá productos para agregar al carrito</p>

        {/* Scanner input */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--ok)', flexShrink:0 }} />
          <input ref={scanRef} type="text" value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { const c = scanInput.trim(); if (c) { addToCart(c); setScanInput(''); } } }}
            placeholder="Escaneá un producto..." autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{ flex:1, border:'none', outline:'none', fontSize:14, background:'transparent', fontFamily:'monospace', color:'var(--text)', padding:0, width:'auto' }}
          />
        </div>

        {/* Búsqueda manual (fallback) */}
        <div style={{ position:'relative', marginBottom:10 }}>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar producto por nombre..."
            style={{ ...inputBase, paddingLeft:12 }}
          />
          {searchResults.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.15)', overflow:'hidden' }}>
              {searchResults.map(p => (
                <button key={p.id} type="button" onClick={() => addToCartById(p.id!)} style={{
                  width:'100%', padding:'10px 14px', border:'none', borderBottom:'1px solid var(--border)',
                  background:'var(--surface)', cursor:'pointer', display:'flex', justifyContent:'space-between',
                  alignItems:'center', fontFamily:'inherit', textAlign:'left',
                }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'var(--text)' }}>{p.nombre}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{p.barcode}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>{formatMoney(p.price)}</div>
                    <div style={{ fontSize:11, color: p.stock===0?'var(--danger)':p.stock<=5?'var(--warn)':'var(--ok)' }}>
                      {p.stock} unid.
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty cart */}
        {cart.length === 0 ? (
          <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text2)' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>🧾</div>
            <div>El carrito está vacío</div>
            <div style={{ fontSize:12, marginTop:4, color:'var(--text2)' }}>Escaneá o buscá productos para comenzar</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {cart.map(item => (
                <div key={item.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'11px 12px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginTop:1 }}>{formatMoney(item.price)} c/u</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <button type="button" onClick={()=>updateQty(item.id, -1)}
                      style={{ width:30, height:30, border:'1px solid var(--border)', borderRadius:8, background:'none', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--warn)' }}>−</button>
                    <span style={{ fontSize:15, fontWeight:700, minWidth:24, textAlign:'center' }}>{item.qty}</span>
                    <button type="button" onClick={()=>updateQty(item.id, 1)}
                      style={{ width:30, height:30, border:'1px solid var(--border)', borderRadius:8, background:'none', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ok)' }}>+</button>
                  </div>
                  <span style={{ fontFamily:'monospace', fontSize:15, fontWeight:700, color:'var(--accent)', flexShrink:0, minWidth:70, textAlign:'right' }}>{formatMoney(item.price*item.qty)}</span>
                  <button type="button" onClick={()=>removeFromCart(item.id)}
                    style={{ width:30, height:30, border:'1px solid var(--border)', borderRadius:8, background:'none', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)' }}>✕</button>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>Descuento (opcional)</div>
              <div style={{ display:'flex', gap:8 }}>
                <input type="number" inputMode="decimal" value={discountVal} onChange={e=>setDiscountVal(e.target.value)} placeholder="0" min="0"
                  style={{ flex:1, ...inputBase, textAlign:'center' }} />
                {(['pct','fixed'] as const).map(t => (
                  <button key={t} type="button" onClick={()=>setDiscType(t)}
                    style={{ padding:'8px 12px', border:discountType===t?'1px solid var(--accent)':'1px solid var(--border)', borderRadius:8, background:discountType===t?'var(--accent-bg)':'var(--surface)', color:discountType===t?'var(--accent)':'var(--text2)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                    {t==='pct'?'%':'$'}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:6 }}>Cliente (opcional)</div>
              <input type="text" value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Nombre del cliente" style={inputBase} />
            </div>

            {/* Total bar */}
            <div style={{ background:'#1a1a2e', color:'#fff', borderRadius:12, padding:14, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, opacity:.7 }}>TOTAL</div>
                <div style={{ fontSize:12, opacity:.6 }}>{totalItems} item{totalItems!==1?'s':''}</div>
                {discount>0 && <div style={{ fontSize:11, opacity:.7, marginTop:1 }}>Descuento: -{formatMoney(discount)}</div>}
              </div>
              <div style={{ fontSize:26, fontWeight:800, fontFamily:'monospace' }}>{formatMoney(total)}</div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button type="button" onClick={cancelSale}
                style={{ flex:.45, padding:13, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', background:'var(--surface2)', color:'var(--text)', fontFamily:'inherit' }}>
                🗑 Vaciar
              </button>
              <button type="button" onClick={()=>setShowConfirm(true)}
                style={{ flex:1, padding:13, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', background:'var(--ok)', color:'#fff', fontFamily:'inherit' }}>
                ✓ Confirmar venta
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirm modal */}
      <IonModal isOpen={showConfirm} onDidDismiss={()=>setShowConfirm(false)}>
        <IonContent style={{'--background':'var(--bg)'} as React.CSSProperties}>
          <div style={{ padding:14, maxWidth:520, margin:'0 auto', paddingBottom:40 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <button type="button" onClick={()=>setShowConfirm(false)}
                style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'var(--text)', padding:0 }}>←</button>
              <h2 style={{ fontSize:18, fontWeight:700 }}>Confirmar venta</h2>
            </div>

            {/* Receipt preview */}
            <div style={{ background:'var(--surface)', border:'2px dashed var(--border)', borderRadius:12, padding:18 }}>
              <div style={{ textAlign:'center', marginBottom:16, paddingBottom:14, borderBottom:'1px dashed var(--border)' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>🏪</div>
                <div style={{ fontWeight:700, fontSize:16 }}>{STORE_NAME()}</div>
                {customer && <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>👤 {customer}</div>}
              </div>
              {cart.map((c,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:14, padding:'4px 0' }}>
                  <span>{c.name} <span style={{ color:'var(--text3)' }}>x{c.qty}</span></span>
                  <span style={{ fontFamily:'monospace' }}>{formatMoney(c.price*c.qty)}</span>
                </div>
              ))}
              {discount>0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, padding:'4px 0', color:'var(--ok-dark)' }}>
                  <span>Descuento</span><span style={{ fontFamily:'monospace' }}>-{formatMoney(discount)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:17, paddingTop:10, marginTop:6, borderTop:'1px dashed var(--border)' }}>
                <span>TOTAL</span><span style={{ fontFamily:'monospace' }}>{formatMoney(total)}</span>
              </div>
            </div>

            <div style={{ marginTop:14, marginBottom:4, fontSize:13, fontWeight:600, color:'var(--text2)' }}>Método de pago</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {(['cash','transfer','card'] as const).map(m => (
                <button key={m} type="button" onClick={()=>setPayMethod(m)}
                  style={{ padding:10, border:payMethod===m?'1.5px solid var(--blue)':'1.5px solid var(--border)', borderRadius:8, background:payMethod===m?'var(--blue-bg)':'var(--surface)', cursor:'pointer', fontSize:13, fontWeight:600, color:payMethod===m?'var(--blue)':'var(--text2)', fontFamily:'inherit' }}>
                  {payLabel(m)}
                </button>
              ))}
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={isFiado} onChange={e=>setIsFiado(e.target.checked)}
                  style={{ width:18, height:18, cursor:'pointer' }} />
                <span style={{ fontSize:14, fontWeight:500 }}>Registrar como deuda (fiado)</span>
              </label>
              {isFiado && (
                <div style={{ fontSize:12, color:'var(--warn)', marginTop:4 }}>
                  ⚠️ Se registrará la deuda en el libro de clientes
                  {!customer.trim() && <div style={{ color:'var(--danger)', marginTop:2 }}>Para fiado necesitás el nombre del cliente.</div>}
                </div>
              )}
            </div>

            <button type="button" onClick={handleExecuteSale} disabled={processing}
              style={{ width:'100%', padding:13, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:processing?'default':'pointer', background:'var(--ok)', color:'#fff', fontFamily:'inherit', opacity:processing?.6:1 }}>
              {processing ? '⏳ Procesando...' : '✓ Confirmar y descontar stock'}
            </button>
            <button type="button" onClick={()=>setShowConfirm(false)}
              style={{ width:'100%', marginTop:8, padding:13, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', background:'var(--surface2)', color:'var(--text)', fontFamily:'inherit' }}>
              ← Volver al carrito
            </button>
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={toast.show}
        onDidDismiss={()=>setToast(t=>({...t,show:false}))}
        message={toast.msg}
        duration={3500}
        position="top"
        color={toast.type==='ok'?'success':toast.type==='warn'?'warning':'danger'}
      />
    </IonContent>
  );
};

export default VentaPage;
