import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonInput,
  IonButton,
  IonButtons,
  IonIcon,
  IonToast,
  IonModal,
} from '@ionic/react';
import { useStore, formatMoney, STOCK_THRESHOLD, CATEGORIES, PLAN_LEVEL, STORE_NAME } from '../context/StoreContext';
import { Producto, Role } from '../types';

interface StockPageProps {
  currentRole: Role;
  onRequirePin: (callback: () => void) => void;
}

const StockPage: React.FC<StockPageProps> = ({ currentRole, onRequirePin }) => {
  const { state, addProduct, updateProduct, deleteProduct } = useStore();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('Todos');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'warn' | 'err'>('ok');
  const [showToast, setShowToast] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Producto | null>(null);
  const [restockAmount, setRestockAmount] = useState('');

  const [addName, setAddName] = useState('');
  const [addBarcode, setAddBarcode] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addStock, setAddStock] = useState('');

  const [editName, setEditName] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  const categories = CATEGORIES();
  const threshold = STOCK_THRESHOLD();
  const planLevel = PLAN_LEVEL();

  const getFilteredProducts = () => {
    return state.productos.filter(p => {
      const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
      const matchCat = planLevel < 2 || activeCat === 'Todos' || p.categoria === activeCat;
      return matchSearch && matchCat;
    }).sort((a, b) => a.stock - b.stock);
  };

  const getStats = () => {
    const total = state.productos.length;
    const units = state.productos.reduce((sum, p) => sum + p.stock, 0);
    const low = state.productos.filter(p => p.stock <= threshold && p.stock > 0).length;
    const empty = state.productos.filter(p => p.stock === 0).length;
    return { total, units, low, empty };
  };

  const stats = getStats();

  const showToastMsg = (msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  const resetAddForm = () => {
    setAddName('');
    setAddBarcode('');
    setAddCategory('');
    setAddPrice('');
    setAddStock('');
  };

  const handleAddProduct = async () => {
    if (!addName.trim() || !addBarcode.trim()) {
      showToastMsg('Completa nombre y código.', 'warn');
      return;
    }
    const exists = state.productos.some(p => p.barcode === addBarcode.trim());
    if (exists) {
      showToastMsg('Ya existe ese código.', 'warn');
      return;
    }

    await addProduct({
      nombre: addName.trim(),
      barcode: addBarcode.trim(),
      categoria: addCategory,
      price: parseFloat(addPrice) || 0,
      stock: parseInt(addStock) || 0,
    });

    showToastMsg(`"${addName}" agregado.`, 'ok');
    setShowAdd(false);
    resetAddForm();
  };

  const openEdit = (product: Producto) => {
    onRequirePin(() => {
      setEditingProduct(product);
      setEditId(product.id!);
      setEditName(product.nombre);
      setEditBarcode(product.barcode);
      setEditCategory(product.categoria || '');
      setEditPrice(product.price?.toString() || '');
      setEditStock(product.stock?.toString() || '');
      setShowEdit(true);
    });
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editBarcode.trim() || editId === null) return;

    await updateProduct({
      id: editId,
      nombre: editName.trim(),
      barcode: editBarcode.trim(),
      categoria: editCategory,
      price: parseFloat(editPrice) || 0,
      stock: parseInt(editStock) || 0,
    });

    showToastMsg(`"${editName}" actualizado.`, 'ok');
    setShowEdit(false);
    setEditingProduct(null);
  };

  const openRestock = (product: Producto) => {
    onRequirePin(() => {
      setRestockingProduct(product);
      setRestockAmount('');
      setShowRestock(true);
    });
  };

  const handleRestock = async () => {
    if (!restockingProduct) return;
    const amount = parseInt(restockAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newStock = restockingProduct.stock + amount;
    await updateProduct({ ...restockingProduct, stock: newStock });
    showToastMsg(`"${restockingProduct.nombre}" -> ${newStock} unid.`, 'ok');
    setShowRestock(false);
    setRestockingProduct(null);
  };

  const handleDelete = (product: Producto) => {
    onRequirePin(async () => {
      if (!confirm(`Eliminar "${product.nombre}"?`)) return;
      await deleteProduct(product.id!);
      showToastMsg(`"${product.nombre}" eliminado.`, 'ok');
    });
  };

  const getStockClass = (stock: number) => {
    if (stock === 0) return { border: 'var(--danger, #d63031)', badge: 'var(--danger, #d63031)' };
    if (stock <= threshold) return { border: '#fde68a', badge: 'var(--warn, #e07b20)' };
    return { border: 'var(--border, #dee2e6)', badge: 'var(--ok, #2d9e5f)' };
  };

  const hasLowStock = stats.low > 0 || stats.empty > 0;

  const renderProductCard = (product: Producto) => {
    const sc = getStockClass(product.stock);
    return (
      <div key={product.id} style={{
        background: 'var(--surface, #fff)',
        border: `1px solid ${sc.border}`,
        borderRadius: 12,
        padding: '11px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 7,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.nombre}</div>
          <div style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', fontFamily: 'monospace', marginTop: 1 }}>{product.barcode || '—'}</div>
          {planLevel >= 2 && product.categoria && (
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginTop: 2 }}>📁 {product.categoria}</div>
          )}
          <div style={{ fontSize: 13, color: 'var(--accent, #6d28d9)', fontWeight: 600, marginTop: 2 }}>{formatMoney(product.price || 0)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 19, fontWeight: 800, minWidth: 28, textAlign: 'right', color: sc.badge }}>{product.stock}</span>
          {currentRole === 'owner' && (
            <>
              <button
                onClick={() => openRestock(product)}
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
              >+</button>
              <button
                onClick={() => openEdit(product)}
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
                  color: 'var(--blue, #2563eb)',
                }}
              >✏️</button>
              <button
                onClick={() => handleDelete(product)}
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
              >✕</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
      <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📦 Stock</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 14 }}>Productos, precios y cantidades</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Productos</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Unidades</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.units}</div>
          </div>
          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text2, #6c757d)', marginBottom: 2 }}>Stock bajo</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.low > 0 ? 'var(--warn, #e07b20)' : 'var(--ok, #2d9e5f)' }}>{stats.low}</div>
          </div>
        </div>

        {hasLowStock && (
          <div style={{
            background: 'var(--warn-bg, #fef3c7)',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--warn, #e07b20)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}>
            ⚠️ {stats.empty > 0 ? `${stats.empty} producto${stats.empty > 1 ? 's' : ''} sin stock` : ''}
            {stats.low > 0 ? `${stats.empty > 0 ? ', ' : ''}${stats.low} con stock bajo` : ''} — toca para ver
          </div>
        )}

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..."
          style={{
            width: '100%',
            border: '1px solid var(--border, #dee2e6)',
            borderRadius: 8,
            padding: 11,
            fontSize: 15,
            background: 'var(--surface, #fff)',
            color: 'var(--text, #1a1a2e)',
            outline: 'none',
            marginBottom: 8,
          }}
        />

        {planLevel >= 2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {['Todos', ...categories].map(cat => (
              <div
                key={cat}
                onClick={() => setActiveCat(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${activeCat === cat ? 'var(--blue, #2563eb)' : 'var(--border, #dee2e6)'}`,
                  background: activeCat === cat ? 'var(--blue-bg, #dbeafe)' : 'var(--surface, #fff)',
                  color: activeCat === cat ? 'var(--blue, #2563eb)' : 'var(--text2, #6c757d)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
          {getFilteredProducts().map(renderProductCard)}
          {getFilteredProducts().length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text2, #6c757d)' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📦</div>
              <div>{state.productos.length === 0 ? 'No hay productos. ¡Agrega uno!' : 'Sin resultados.'}</div>
            </div>
          )}
        </div>

        {currentRole === 'owner' && (
          <button
            onClick={() => {
              resetAddForm();
              setShowAdd(true);
            }}
            style={{
              width: '100%',
              padding: 13,
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--blue, #2563eb)',
              color: '#fff',
              fontFamily: 'inherit',
            }}
          >
            + Agregar producto
          </button>
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

      <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)}>
        <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
          <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 26,
                  cursor: 'pointer',
                  color: 'var(--text, #1a1a2e)',
                  padding: 0,
                }}
              >←</button>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nuevo producto</h2>
            </div>

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Nombre *</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Ej: Gaseosa 500ml"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 10,
              }}
            />

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Código de barras *</label>
            <input
              type="text"
              value={addBarcode}
              onChange={(e) => setAddBarcode(e.target.value)}
              placeholder="Escaneá o escribí el código"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                fontFamily: '"Courier New", monospace',
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 4,
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', marginTop: 4, marginBottom: 6 }}>Tocá este campo y escaneá con el lector</p>

            {planLevel >= 2 && (
              <>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Categoría</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border, #dee2e6)',
                    borderRadius: 8,
                    padding: 11,
                    fontSize: 15,
                    background: 'var(--surface, #fff)',
                    color: 'var(--text, #1a1a2e)',
                    outline: 'none',
                    marginBottom: 10,
                  }}
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Precio de venta ($) *</label>
            <input
              type="number"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              placeholder="Ej: 1250.50"
              min="0"
              step="0.01"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 10,
              }}
            />

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Stock inicial</label>
            <input
              type="number"
              value={addStock}
              onChange={(e) => setAddStock(e.target.value)}
              placeholder="0"
              min="0"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 12,
              }}
            />

            <button
              onClick={handleAddProduct}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--blue, #2563eb)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              Guardar producto
            </button>
            <button
              onClick={() => setShowAdd(false)}
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
              Cancelar
            </button>
          </div>
        </IonContent>
      </IonModal>

      <IonModal isOpen={showEdit} onDidDismiss={() => setShowEdit(false)}>
        <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
          <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => setShowEdit(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 26,
                  cursor: 'pointer',
                  color: 'var(--text, #1a1a2e)',
                  padding: 0,
                }}
              >←</button>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Editar producto</h2>
            </div>

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Nombre *</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 10,
              }}
            />

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Código de barras *</label>
            <input
              type="text"
              value={editBarcode}
              onChange={(e) => setEditBarcode(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                fontFamily: '"Courier New", monospace',
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 10,
              }}
            />

            {planLevel >= 2 && (
              <>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Categoría</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border, #dee2e6)',
                    borderRadius: 8,
                    padding: 11,
                    fontSize: 15,
                    background: 'var(--surface, #fff)',
                    color: 'var(--text, #1a1a2e)',
                    outline: 'none',
                    marginBottom: 10,
                  }}
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Precio de venta ($)</label>
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 10,
              }}
            />

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Stock actual</label>
            <input
              type="number"
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
              min="0"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 15,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                marginBottom: 4,
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', marginTop: 4, marginBottom: 6 }}>Podés editar el stock directamente aquí</p>

            <button
              onClick={handleSaveEdit}
              style={{
                width: '100%',
                padding: 13,
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--blue, #2563eb)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              Guardar cambios
            </button>
            <button
              onClick={() => setShowEdit(false)}
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
              Cancelar
            </button>
          </div>
        </IonContent>
      </IonModal>

      <IonModal isOpen={showRestock} onDidDismiss={() => setShowRestock(false)}>
        <IonContent style={{ '--background': 'var(--bg, #f0f2f5)' } as React.CSSProperties}>
          <div style={{ padding: 14, maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button
                onClick={() => setShowRestock(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 26,
                  cursor: 'pointer',
                  color: 'var(--text, #1a1a2e)',
                  padding: 0,
                }}
              >←</button>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Reponer stock</h2>
            </div>

            {restockingProduct && (
              <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #dee2e6)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{restockingProduct.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text3, #adb5bd)', fontFamily: 'monospace', marginTop: 2 }}>{restockingProduct.barcode}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2, #6c757d)' }}>Stock: <strong style={{ color: 'var(--ok, #2d9e5f)' }}>{restockingProduct.stock} unid.</strong></span>
                  <span style={{ fontSize: 13, color: 'var(--text2, #6c757d)' }}>Precio: <strong style={{ color: 'var(--accent, #6d28d9)' }}>{formatMoney(restockingProduct.price || 0)}</strong></span>
                </div>
              </div>
            )}

            <label style={{ display: 'block', fontSize: 13, color: 'var(--text2, #6c757d)', marginBottom: 5, marginTop: 12 }}>Cuántas unidades agregas?</label>
            <input
              type="number"
              value={restockAmount}
              onChange={(e) => setRestockAmount(e.target.value)}
              placeholder="Ej: 12"
              min="1"
              style={{
                width: '100%',
                border: '1px solid var(--border, #dee2e6)',
                borderRadius: 8,
                padding: 11,
                fontSize: 22,
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a2e)',
                outline: 'none',
                textAlign: 'center',
              }}
            />

            {restockingProduct && !isNaN(parseInt(restockAmount)) && parseInt(restockAmount) > 0 && (
              <div style={{ background: 'var(--ok-bg, #d3f9e3)', border: '1px solid #a7f3c9', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--ok-dark, #1a6e3f)', marginTop: 6 }}>
                Stock nuevo: <strong>{restockingProduct.stock + parseInt(restockAmount)} unid.</strong>
              </div>
            )}

            <button
              onClick={handleRestock}
              style={{
                width: '100%',
                marginTop: 14,
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
              ✓ Confirmar reposición
            </button>
            <button
              onClick={() => setShowRestock(false)}
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
              Cancelar
            </button>
          </div>
        </IonContent>
      </IonModal>
    </IonContent>
  );
};

export default StockPage;