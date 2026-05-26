import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonInput,
  IonButton,
  IonButtons,
  IonIcon,
  IonBadge,
  IonToast,
  IonModal,
} from '@ionic/react';
import { cartOutline, removeOutline, addOutline, trashOutline, checkmarkOutline, chevronForwardOutline } from 'ionicons/icons';
import { useStore, formatMoney, STORE_NAME, PLAN_LEVEL } from '../context/StoreContext';
import { Role, PlanLevel, SaleItem as SaleItemType } from '../types';

interface CartItem extends SaleItemType {
  id: number;
  barcode: string;
}

interface VentaPageProps {
  currentRole: Role;
  currentEmployee: string | null;
  onRoleBadgeClick: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

const VentaPage: React.FC<VentaPageProps> = ({
  currentRole,
  currentEmployee,
  onRoleBadgeClick,
  onThemeToggle,
  isDark,
}) => {
  const { state, getProductByBarcode, updateProduct, addSale, addDebt } = useStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'pct' | 'fixed'>('pct');
  const [customerName, setCustomerName] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'warn' | 'err'>('ok');
  const [showToast, setShowToast] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [isFiado, setIsFiado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, []);

  const showToastMsg = (msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  const addToCart = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (!product) {
      showToastMsg(`Código no encontrado: ${barcode}`, 'err');
      return;
    }
    if (product.stock === 0) {
      showToastMsg(`${product.nombre} - Sin stock!`, 'warn');
      return;
    }
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        showToastMsg(`${product.nombre} - Stock máximo: ${product.stock}`, 'warn');
        return;
      }
      setCart(cart.map(c =>
        c.id === product.id ? { ...c, qty: c.qty + 1 } : c
      ));
    } else {
      setCart([...cart, {
        id: product.id!,
        name: product.nombre,
        barcode: product.barcode,
        price: product.price,
        qty: 1,
      }]);
    }
    showToastMsg(`${product.nombre} agregado`, 'ok');
  };

  const handleScanKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const code = scanInput.trim();
      if (code) {
        addToCart(code);
        setScanInput('');
      }
    }
  };

  const updateCartQty = (id: number, delta: number) => {
    const product = state.productos.find(p => p.id === id);
    const item = cart.find(c => c.id === id);
    if (!item || !product) return;

    if (delta > 0 && item.qty >= product.stock) {
      showToastMsg(`Stock máximo: ${product.stock} unid.`, 'warn');
      return;
    }

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.id !== id));
    } else {
      setCart(cart.map(c => c.id === id ? { ...c, qty: newQty } : c));
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const cancelSale = () => {
    if (cart.length > 0 && !confirm('Vaciar el carrito?')) return;
    setCart([]);
    setDiscountValue('');
    setCustomerName('');
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const getDiscountAmount = () => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return 0;
    const subtotal = getSubtotal();
    if (discountType === 'pct') return Math.min(subtotal, subtotal * val / 100);
    return Math.min(subtotal, val);
  };

  const getTotal = () => getSubtotal() - getDiscountAmount();

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.qty, 0);

  const renderConfirmReceipt = () => {
    const subtotal = getSubtotal();
    const disc = getDiscountAmount();
    const total = getTotal();

    return (
      <div style={{
        background: 'var(--surface, #fff)',
        border: '2px dashed var(--border, #dee2e6)',
        borderRadius: 12,
        padding: 18,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '1px dashed var(--border, #dee2e6)' }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>🏪</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{STORE_NAME()}</div>
          {customerName && <div style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginTop: 4 }}>👤 {customerName}</div>}
        </div>

        {cart.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
            <span>{item.name} <span style={{ color: 'var(--text3, #adb5bd)' }}>x{item.qty}</span></span>
            <span style={{ fontFamily: '"Courier New", monospace' }}>{formatMoney(item.price * item.qty)}</span>
          </div>
        ))}

        {disc > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', color: 'var(--ok-dark, #1a6e3f)' }}>
            <span>Descuento</span>
            <span style={{ fontFamily: '"Courier New", monospace' }}>-{formatMoney(disc)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17, paddingTop: 10, marginTop: 6, borderTop: '1px dashed var(--border, #dee2e6)' }}>
          <span>TOTAL</span>
          <span style={{ fontFamily: '"Courier New", monospace' }}>{formatMoney(total)}</span>
        </div>
      </div>
    );
  };

  const handleExecuteSale = async () => {
    if (cart.length === 0) return;

    const subtotal = getSubtotal();
    const disc = getDiscountAmount();
    const total = getTotal();
    const employeeName = currentRole === 'employee' ? currentEmployee : null;

    const stockMovements = [];
    for (const item of cart) {
      const product = state.productos.find(p => p.id === item.id);
      if (!product) continue;
      const before = product.stock;
      const deducted = Math.min(item.qty, before);
      const newStock = Math.max(0, product.stock - item.qty);

      stockMovements.push({
        name: item.name,
        requested: item.qty,
        deducted,
        before,
        after: newStock,
      });

      await updateProduct({ ...product, stock: newStock });
    }

    const sale = {
      items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
      total,
      discount: disc,
      payMethod,
      customer: customerName,
      fiado: isFiado,
      employee: employeeName,
      stockMovements,
      created: Date.now(),
    };

    await addSale(sale);

    if (isFiado && customerName) {
      await addDebt({
        customer: customerName,
        amount: total,
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        created: Date.now(),
      });
    }

    setCart([]);
    setShowConfirm(false);
    showToastMsg('Venta confirmada!', 'ok');
  };

  const roleLabel = currentRole === 'owner' ? '👤 Dueño' : `👨‍🔧 ${currentEmployee || 'Empleado'}`;
  const roleBadgeClass = currentRole === 'owner' ? 'owner' : 'employee';

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>🛒 Venta</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--text2, #6c757d)' }}>{currentTime}</span>
              <button
                onClick={onRoleBadgeClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  background: roleBadgeClass === 'owner' ? 'var(--blue-bg, #dbeafe)' : 'var(--ok-bg, #d3f9e3)',
                  color: roleBadgeClass === 'owner' ? 'var(--blue, #2563eb)' : 'var(--ok-dark, #1a6e3f)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {roleLabel} 🔄
              </button>
            </div>
          </div>
          <button
            onClick={onThemeToggle}
            style={{
              width: 46,
              height: 26,
              borderRadius: 99,
              background: isDark ? '#3b3f5c' : 'var(--surface3, #e9ecef)',
              border: '1px solid var(--border, #dee2e6)',
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 3,
              left: isDark ? 23 : 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: isDark ? '#c7d2fe' : '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,.25)',
              transition: 'transform .25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
            }}>
              {isDark ? '🌙' : '☀️'}
            </div>
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 14 }}>Escaneá productos para agregar al carrito</p>

        <div style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border, #dee2e6)',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--ok, #2d9e5f)', flexShrink: 0, animation: 'pulse 2s infinite' }} />
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleScanKey}
            placeholder="Escaneá un producto..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              background: 'transparent',
              fontFamily: '"Courier New", monospace',
              color: 'var(--text, #1a1a2e)',
              padding: 0,
              width: 'auto',
            }}
          />
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text2, #6c757d)' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🧾</div>
            <div>El carrito está vacío</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text2, #6c757d)' }}>Escaneá productos para comenzar</div>
          </div>
        ) : (
          <div>
            <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {cart.map((item, i) => (
                <div key={i} style={{
                  background: 'var(--surface, #fff)',
                  border: '1px solid var(--border, #dee2e6)',
                  borderRadius: 12,
                  padding: '11px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2, #6c757d)', marginTop: 1 }}>{formatMoney(item.price)} c/u</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      style={{
                        width: 30,
                        height: 30,
                        border: '1px solid var(--border, #dee2e6)',
                        borderRadius: 8,
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 15,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--warn, #e07b20)',
                      }}
                    >−</button>
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      style={{
                        width: 30,
                        height: 30,
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
                    >+</button>
                  </div>
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: 15, fontWeight: 700, color: 'var(--accent, #6d28d9)', flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                    {formatMoney(item.price * item.qty)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      width: 30,
                      height: 30,
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
                  >✕</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', marginBottom: 6 }}>Descuento (opcional)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  style={{
                    flex: 1,
                    border: '1px solid var(--border, #dee2e6)',
                    borderRadius: 8,
                    padding: 11,
                    fontSize: 15,
                    background: 'var(--surface, #fff)',
                    color: 'var(--text, #1a1a2e)',
                    outline: 'none',
                    textAlign: 'center',
                  }}
                />
                <button
                  onClick={() => setDiscountType('pct')}
                  style={{
                    padding: '8px 12px',
                    border: discountType === 'pct' ? '1px solid var(--accent, #6d28d9)' : '1px solid var(--border, #dee2e6)',
                    borderRadius: 8,
                    background: discountType === 'pct' ? 'var(--accent-bg, #ede9fe)' : 'var(--surface, #fff)',
                    color: discountType === 'pct' ? 'var(--accent, #6d28d9)' : 'var(--text2, #6c757d)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >%</button>
                <button
                  onClick={() => setDiscountType('fixed')}
                  style={{
                    padding: '8px 12px',
                    border: discountType === 'fixed' ? '1px solid var(--accent, #6d28d9)' : '1px solid var(--border, #dee2e6)',
                    borderRadius: 8,
                    background: discountType === 'fixed' ? 'var(--accent-bg, #ede9fe)' : 'var(--surface, #fff)',
                    color: discountType === 'fixed' ? 'var(--accent, #6d28d9)' : 'var(--text2, #6c757d)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >$</button>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2, #6c757d)', marginBottom: 6 }}>Cliente (opcional)</div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
                style={{
                  width: '100%',
                  border: '1px solid var(--border, #dee2e6)',
                  borderRadius: 8,
                  padding: 11,
                  fontSize: 15,
                  background: 'var(--surface, #fff)',
                  color: 'var(--text, #1a1a2e)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{
              background: '#1a1a2e',
              color: '#fff',
              borderRadius: 12,
              padding: 14,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>TOTAL</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{getTotalItems()} items</div>
                {getDiscountAmount() > 0 && (
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 1 }}>Descuento: -{formatMoney(getDiscountAmount())}</div>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: '"Courier New", monospace' }}>
                {formatMoney(getTotal())}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={cancelSale}
                style={{
                  flex: 0.45,
                  padding: 13,
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'var(--surface2, #f1f3f5)',
                  color: 'var(--text, #1a1a2e)',
                  fontFamily: 'inherit',
                }}
              >
                🗑 Vaciar
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  flex: 1,
                  padding: 13,
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'var(--ok, #2d9e5f)',
                  color: '#fff',
                  fontFamily: 'inherit',
                }}
              >
                ✓ Confirmar venta
              </button>
            </div>
          </div>
        )}
      </div>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMsg}
        duration={3500}
        position="top"
        color={toastType === 'ok' ? 'success' : toastType === 'warn' ? 'warning' : 'danger'}
      />

      <IonModal isOpen={showConfirm} onDidDismiss={() => setShowConfirm(false)}>
        <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
          <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 26,
                  cursor: 'pointer',
                  color: 'var(--text, #1a1a2e)',
                  padding: 0,
                }}
              >←</button>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Confirmar venta</h2>
            </div>

            {renderConfirmReceipt()}

            <div style={{ marginTop: 14, marginBottom: 4, fontSize: 13, fontWeight: 600, color: 'var(--text2, #6c757d)' }}>
              Método de pago
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {(['cash', 'transfer', 'card'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  style={{
                    padding: 10,
                    border: payMethod === m ? '1.5px solid var(--blue, #2563eb)' : '1.5px solid var(--border, #dee2e6)',
                    borderRadius: 8,
                    background: payMethod === m ? 'var(--blue-bg, #dbeafe)' : 'var(--surface, #fff)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: payMethod === m ? 'var(--blue, #2563eb)' : 'var(--text2, #6c757d)',
                    fontFamily: 'inherit',
                  }}
                >
                  {m === 'cash' ? '💵 Efectivo' : m === 'transfer' ? '📱 Transfer.' : '💳 Tarjeta'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isFiado}
                  onChange={(e) => setIsFiado(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Registrar como deuda (fiado)</span>
              </label>
              {isFiado && (
                <div style={{ fontSize: 12, color: 'var(--warn, #e07b20)', marginTop: 4 }}>⚠️ Se registrará la deuda en el libro de clientes</div>
              )}
            </div>

            <button
              onClick={handleExecuteSale}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--ok, #2d9e5f)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              ✓ Confirmar y descontar stock
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                width: '100%',
                marginTop: 8,
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--surface2, #f1f3f5)',
                color: 'var(--text, #1a1a2e)',
                fontFamily: 'inherit',
              }}
            >
              ← Volver al carrito
            </button>
          </div>
        </IonContent>
      </IonModal>
    </IonContent>
  );
};

export default VentaPage;