import React, { useState } from 'react';
import { setSetting, STORE_NAME, useStore } from '../context/StoreContext';

interface Props { onDone: () => void; }

const steps = [
  {
    emoji: '🏪', title: '¡Bienvenido a tu almacén!',
    desc: 'Vamos a configurar todo en 3 pasos. Solo te lleva 2 minutos.',
    action: null as null | 'name' | 'product',
  },
  {
    emoji: '✏️', title: 'Nombre de tu almacén',
    desc: '¿Cómo se llama tu almacén? Aparecerá en los tickets de venta.',
    action: 'name' as const,
  },
  {
    emoji: '📦', title: 'Agregá tu primer producto',
    desc: 'Escaneá el código de barras de un producto o ingresalo manualmente.',
    action: 'product' as const,
  },
  {
    emoji: '✅', title: '¡Todo listo!',
    desc: 'Ya podés empezar a vender. Escaneá productos en la pantalla de venta.',
    action: null,
  },
];

const Onboarding: React.FC<Props> = ({ onDone }) => {
  const [step, setStep]         = useState(0);
  const [storeName, setName]    = useState(STORE_NAME());
  const [prodName, setProdName] = useState('');
  const [barcode, setBarcode]   = useState('');
  const [price, setPrice]       = useState('');
  const [stock, setStock]       = useState('');
  const [busy, setBusy]         = useState(false);
  const { addProduct }          = useStore();

  const current = steps[step];

  const handleNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (current.action === 'name') {
        if (!storeName.trim()) return;
        await setSetting('store-name', storeName.trim());
      }
      if (current.action === 'product') {
        if (prodName.trim() && barcode.trim()) {
          const pr = parseFloat(price);
          const st = parseInt(stock, 10);
          await addProduct({
            nombre: prodName.trim(),
            barcode: barcode.trim(),
            price: Number.isFinite(pr) && pr >= 0 ? pr : 0,
            stock: Number.isFinite(st) && st >= 0 ? st : 0,
          });
        }
      }
      if (step < steps.length - 1) {
        setStep(s => s + 1);
      } else {
        await setSetting('onboarding-done', 'true');
        onDone();
      }
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width:'100%', border:'1px solid var(--border)', borderRadius:8, padding:11,
    fontSize:15, background:'var(--surface)', color:'var(--text)', outline:'none', marginBottom:10,
  };

  const progress = (step / (steps.length - 1)) * 100;

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg)', zIndex:800, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
      {/* Progress bar */}
      <div style={{ width:'100%', maxWidth:320, height:4, background:'var(--surface3)', borderRadius:99, marginBottom:32, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'var(--blue)', borderRadius:99, transition:'width .4s ease' }} />
      </div>

      <div style={{ fontSize:56, marginBottom:16 }}>{current.emoji}</div>
      <div style={{ fontSize:22, fontWeight:700, marginBottom:8, textAlign:'center' }}>{current.title}</div>
      <div style={{ fontSize:14, color:'var(--text2)', textAlign:'center', marginBottom:28, lineHeight:1.6, maxWidth:290 }}>{current.desc}</div>

      {current.action === 'name' && (
        <div style={{ width:'100%', maxWidth:290 }}>
          <input type="text" value={storeName} onChange={e=>setName(e.target.value)}
            placeholder="Ej: Almacén Don Juan" autoFocus style={inputStyle}
            aria-label="Nombre del almacén" />
        </div>
      )}

      {current.action === 'product' && (
        <div style={{ width:'100%', maxWidth:290 }}>
          <input type="text" value={prodName} onChange={e=>setProdName(e.target.value)}
            placeholder="Nombre del producto" style={inputStyle}
            aria-label="Nombre del producto" />
          <input type="text" value={barcode} onChange={e=>setBarcode(e.target.value)}
            placeholder="Código de barras" className="mono" autoComplete="off" style={inputStyle}
            inputMode="numeric" aria-label="Código de barras" />
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1 }}>
              <input type="number" value={price} onChange={e=>setPrice(e.target.value)}
                placeholder="Precio $" min={0} inputMode="decimal"
                style={{ ...inputStyle, marginBottom:0 }} aria-label="Precio" />
            </div>
            <div style={{ flex:1 }}>
              <input type="number" value={stock} onChange={e=>setStock(e.target.value)}
                placeholder="Stock inicial" min={0} inputMode="numeric"
                style={{ ...inputStyle, marginBottom:0 }} aria-label="Stock inicial" />
            </div>
          </div>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>Podés saltear este paso y agregar productos después</p>
        </div>
      )}

      <div style={{ display:'flex', gap:12, marginTop:24, width:'100%', maxWidth:290 }}>
        {step > 0 && step < steps.length - 1 && (
          <button type="button" onClick={() => setStep(s=>s-1)} style={{ flex:.4, padding:13, border:'1px solid var(--border)', borderRadius:12, background:'var(--surface2)', color:'var(--text)', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            ←
          </button>
        )}
        <button type="button" onClick={handleNext}
          disabled={busy || (current.action === 'name' && !storeName.trim())}
          style={{ flex:1, padding:13, border:'none', borderRadius:12, background:'var(--blue)', color:'#fff', fontSize:15, fontWeight:600, cursor:busy?'wait':'pointer', fontFamily:'inherit', marginTop:0, opacity: busy ? 0.7 : 1 }}>
          {step === steps.length - 1 ? '🚀 Empezar' : 'Siguiente →'}
        </button>
      </div>

      {(current.action === 'product') && (
        <button type="button" onClick={handleNext} style={{ marginTop:12, fontSize:13, color:'var(--text2)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          Saltear este paso
        </button>
      )}
    </div>
  );
};

export default Onboarding;
