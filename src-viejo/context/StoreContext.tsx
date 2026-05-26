import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Producto, Sale, Debt, Categoria, SaleItem, StockMovement } from '../types';

const DB_NAME = 'almacen-db';
const DB_VER = 3;

interface StoreState {
  productos: Producto[];
  sales: Sale[];
  debts: Debt[];
  categories: string[];
  loading: boolean;
}

type Action =
  | { type: 'SET_PRODUCTOS'; payload: Producto[] }
  | { type: 'ADD_PRODUCTO'; payload: Producto }
  | { type: 'UPDATE_PRODUCTO'; payload: Producto }
  | { type: 'DELETE_PRODUCTO'; payload: number }
  | { type: 'SET_SALES'; payload: Sale[] }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'DELETE_SALE'; payload: number }
  | { type: 'SET_DEBTS'; payload: Debt[] }
  | { type: 'ADD_DEBT'; payload: Debt }
  | { type: 'DELETE_DEBT'; payload: number }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: StoreState = {
  productos: [],
  sales: [],
  debts: [],
  categories: [],
  loading: true,
};

function storeReducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_PRODUCTOS':
      return { ...state, productos: action.payload };
    case 'ADD_PRODUCTO':
      return { ...state, productos: [...state.productos, action.payload] };
    case 'UPDATE_PRODUCTO':
      return { ...state, productos: state.productos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCTO':
      return { ...state, productos: state.productos.filter(p => p.id !== action.payload) };
    case 'SET_SALES':
      return { ...state, sales: action.payload };
    case 'ADD_SALE':
      return { ...state, sales: [action.payload, ...state.sales] };
    case 'DELETE_SALE':
      return { ...state, sales: state.sales.filter(s => s.id !== action.payload) };
    case 'SET_DEBTS':
      return { ...state, debts: action.payload };
    case 'ADD_DEBT':
      return { ...state, debts: [action.payload, ...state.debts] };
    case 'DELETE_DEBT':
      return { ...state, debts: state.debts.filter(d => d.id !== action.payload) };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface StoreContextType {
  state: StoreState;
  addProduct: (product: Omit<Producto, 'id'>) => Promise<void>;
  updateProduct: (product: Producto) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  deleteSale: (id: number) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
  deleteDebt: (id: number) => Promise<void>;
  getProductByBarcode: (barcode: string) => Producto | undefined;
  getProductById: (id: number) => Producto | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (dbInstance) { res(dbInstance); return; }
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains('products')) {
        const s = d.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        s.createIndex('barcode', 'barcode', { unique: true });
      }
      if (!d.objectStoreNames.contains('sales'))
        d.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('debts'))
        d.createObjectStore('debts', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('settings'))
        d.createObjectStore('settings', { keyPath: 'k' });
    };
    r.onsuccess = (e: Event) => { dbInstance = (e.target as IDBOpenDBRequest).result; res(dbInstance); };
    r.onerror = () => rej(r.error);
  });
}

function txs(store: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
  return dbInstance!.transaction(store, mode).objectStore(store);
}

function dbGetAll<T>(store: string): Promise<T[]> {
  return new Promise((res, rej) => {
    const r = txs(store).getAll();
    r.onsuccess = () => res(r.result as T[]);
    r.onerror = () => rej(r.error);
  });
}

function dbPut<T>(store: string, obj: T): Promise<number> {
  return new Promise((res, rej) => {
    const r = txs(store, 'readwrite').put(obj);
    r.onsuccess = () => res(r.result as number);
    r.onerror = () => rej(r.error);
  });
}

function dbAdd<T>(store: string, obj: T): Promise<number> {
  return new Promise((res, rej) => {
    const r = txs(store, 'readwrite').add(obj);
    r.onsuccess = () => res(r.result as number);
    r.onerror = () => rej(r.error);
  });
}

function dbDelete(store: string, id: number): Promise<void> {
  return new Promise((res, rej) => {
    const r = txs(store, 'readwrite').delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

function dbClear(store: string): Promise<void> {
  return new Promise((res, rej) => {
    const r = txs(store, 'readwrite').clear();
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

const settingsCache: Record<string, string> = {};

function getSetting(k: string, def?: string): string {
  const v = settingsCache[k];
  return (v !== undefined && v !== null && v !== '') ? v : (def !== undefined ? def : '');
}

function setSetting(k: string, v: string) {
  settingsCache[k] = v;
  try { dbPut('settings', { k, v }); } catch (e) { }
}

async function loadAllSettings() {
  try {
    const all: { k: string; v: string }[] = await dbGetAll('settings');
    for (const s of all) settingsCache[s.k] = s.v;
  } catch (e) { }
}

export function STORE_NAME() { return getSetting('store-name', 'Mi Almacén'); }
export function STOCK_THRESHOLD() { return parseInt(getSetting('stock-threshold', '5')) || 5; }
export function CATEGORIES() {
  const raw = getSetting('categories', 'Bebidas\nAlmacén\nLácteos\nCarnes\nLimpieza\nPanadería\nFrutas y verduras\nOtros');
  return raw.split('\n').filter(c => c.trim());
}
export function PIN_OWNER(): string {
  const fromLocal = localStorage.getItem('pin-owner');
  if (fromLocal !== null) return fromLocal;
  return getSetting('pin-owner', '');
}
export function PLAN_LEVEL(): number {
  const fromLocal = localStorage.getItem('plan-level');
  if (fromLocal) return parseInt(fromLocal) || 0;
  return parseInt(getSetting('plan-level', '0')) || 0;
}

function EMPLOYEES() {
  const raw = getSetting('employees', '[]');
  try { return JSON.parse(raw); } catch (e) { return []; }
}

export const MASTER_PIN = '2202';

export function validateCode(raw: string): number {
  if (!raw) return 0;
  const code = raw.trim().toUpperCase().replace(/\s/g, '');
  const parts = code.split('-');
  if (parts.length !== 2) return 0;
  const prefix = parts[0];
  const num = parts[1];
  if (!/^\d{4}$/.test(num)) return 0;
  const d = num.split('');
  const digitSum = parseInt(d[0]) + parseInt(d[1]) + parseInt(d[2]) + parseInt(d[3]);
  const planMods: Record<string, number> = { BAS: 2, EST: 4, PRE: 6 };
  if (planMods[prefix] === undefined) return 0;
  if (digitSum % 7 !== planMods[prefix]) return 0;
  const planLevels: Record<string, number> = { BAS: 1, EST: 2, PRE: 3 };
  return planLevels[prefix] || 0;
}

export function planName(level: number): string {
  if (level === 3) return 'Premium';
  if (level === 2) return 'Estándar';
  if (level === 1) return 'Básico';
  return 'Sin activar';
}

export function planFeatures(level: number): string {
  if (level === 3) return 'Venta · Stock · Reportes · Categorías · Deudas · PIN empleado';
  if (level === 2) return 'Venta · Stock · Reportes · Categorías · Deudas';
  return 'Venta · Stock · Historial · Backup';
}

export function formatMoney(n: number): string {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        await openDB();
        await loadAllSettings();

        const [productos, sales, debts] = await Promise.all([
          dbGetAll<Producto>('products'),
          dbGetAll<Sale>('sales'),
          dbGetAll<Debt>('debts'),
        ]);

        dispatch({ type: 'SET_PRODUCTOS', payload: productos });
        dispatch({ type: 'SET_SALES', payload: sales });
        dispatch({ type: 'SET_DEBTS', payload: debts });
        dispatch({ type: 'SET_CATEGORIES', payload: CATEGORIES() });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (e) {
        console.error('Init error:', e);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
  }, []);

  const addProduct = useCallback(async (product: Omit<Producto, 'id'>) => {
    const id = await dbAdd('products', product);
    dispatch({ type: 'ADD_PRODUCTO', payload: { ...product, id } });
  }, []);

  const updateProduct = useCallback(async (product: Producto) => {
    await dbPut('products', product);
    dispatch({ type: 'UPDATE_PRODUCTO', payload: product });
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await dbDelete('products', id);
    dispatch({ type: 'DELETE_PRODUCTO', payload: id });
  }, []);

  const addSale = useCallback(async (sale: Omit<Sale, 'id'>) => {
    const id = await dbAdd('sales', sale);
    dispatch({ type: 'ADD_SALE', payload: { ...sale, id } });
  }, []);

  const deleteSale = useCallback(async (id: number) => {
    await dbDelete('sales', id);
    dispatch({ type: 'DELETE_SALE', payload: id });
  }, []);

  const addDebt = useCallback(async (debt: Omit<Debt, 'id'>) => {
    const id = await dbAdd('debts', debt);
    dispatch({ type: 'ADD_DEBT', payload: { ...debt, id } });
  }, []);

  const deleteDebt = useCallback(async (id: number) => {
    await dbDelete('debts', id);
    dispatch({ type: 'DELETE_DEBT', payload: id });
  }, []);

  const getProductByBarcode = useCallback((barcode: string) => {
    return state.productos.find(p => p.barcode === barcode);
  }, [state.productos]);

  const getProductById = useCallback((id: number) => {
    return state.productos.find(p => p.id === id);
  }, [state.productos]);

  return (
    <StoreContext.Provider value={{
      state,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      deleteSale,
      addDebt,
      deleteDebt,
      getProductByBarcode,
      getProductById,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};