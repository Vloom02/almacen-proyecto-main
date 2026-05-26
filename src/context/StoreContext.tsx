import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Producto, Sale, Debt, SyncQueueItem, LicenseInfo, Employee } from '../types';

// ─── DB ─────────────────────────────────────────────────────────────────────
const DB_NAME = 'almacen-db';
const DB_VER  = 5;
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
      if (!d.objectStoreNames.contains('syncQueue'))
        d.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
    };
    r.onsuccess = (e) => { dbInstance = (e.target as IDBOpenDBRequest).result; res(dbInstance!); };
    r.onerror   = () => rej(r.error);
  });
}

function txs(store: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
  if (!dbInstance) throw new Error('DB not initialized');
  return dbInstance.transaction(store, mode).objectStore(store);
}
const dbGetAll = <T,>(s: string): Promise<T[]> =>
  new Promise((res, rej) => { const r = txs(s).getAll(); r.onsuccess = () => res(r.result as T[]); r.onerror = () => rej(r.error); });
const dbPut    = <T,>(s: string, o: T): Promise<number> =>
  new Promise((res, rej) => { const r = txs(s,'readwrite').put(o); r.onsuccess = () => res(r.result as number); r.onerror = () => rej(r.error); });
const dbAdd    = <T,>(s: string, o: T): Promise<number> =>
  new Promise((res, rej) => { const r = txs(s,'readwrite').add(o); r.onsuccess = () => res(r.result as number); r.onerror = () => rej(r.error); });
const dbDelete = (s: string, id: number): Promise<void> =>
  new Promise((res, rej) => { const r = txs(s,'readwrite').delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
const dbCount  = (s: string): Promise<number> =>
  new Promise((res, rej) => { const r = txs(s).count(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export const dbClear = (s: string): Promise<void> =>
  new Promise((res, rej) => { const r = txs(s,'readwrite').clear(); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });

export { dbGetAll, dbPut, dbAdd, dbDelete };

// ─── SETTINGS ───────────────────────────────────────────────────────────────
// Cache es la fuente de verdad en runtime. dbPut se llama en background.
const settingsCache: Record<string, string> = {};

/**
 * Devuelve el setting si está definido en cache. Si no, devuelve `def`.
 * El string vacío SÍ se considera valor válido (para que el dueño pueda
 * limpiar un PIN, por ejemplo, sin que vuelva a aparecer el default).
 */
export function getSetting(k: string, def = ''): string {
  const v = settingsCache[k];
  return v === undefined ? def : v;
}

/** Guarda el setting en cache + persiste en IndexedDB (fire-and-forget). */
export function setSetting(k: string, v: string): void {
  settingsCache[k] = v;
  if (dbInstance) {
    dbPut('settings', { k, v }).catch(err => console.warn('setSetting persist failed', k, err));
  }
}

async function loadAllSettings() {
  const all: { k: string; v: string }[] = await dbGetAll('settings');
  for (const s of all) settingsCache[s.k] = s.v;
}

async function migrateLocalStorage() {
  const keys = ['store-name','stock-threshold','categories','plan-level','plan-expires-at',
                'pin-owner','employees','pin-employee','theme','last-backup',
                'backup-snoozed','store-id','last-sync','onboarding-done'];
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v !== null && settingsCache[k] === undefined) setSetting(k, v);
    } catch {/* localStorage puede estar bloqueado (privacidad) */}
  }
}

// ─── SETTINGS ACCESSORS ─────────────────────────────────────────────────────
export const STORE_NAME      = () => getSetting('store-name', 'Mi Almacén') || 'Mi Almacén';
export const STOCK_THRESHOLD = () => parseInt(getSetting('stock-threshold','5'), 10) || 5;
export const CATEGORIES      = () =>
  getSetting('categories','Bebidas\nAlmacén\nLácteos\nCarnes\nLimpieza\nPanadería\nFrutas y verduras\nOtros')
    .split('\n').map(c => c.trim()).filter(Boolean);
export const PIN_OWNER       = () => getSetting('pin-owner','');
export const PLAN_LEVEL      = () => parseInt(getSetting('plan-level','0'), 10) || 0;
export const EMPLOYEES       = (): Employee[] => {
  try { return JSON.parse(getSetting('employees','[]')); } catch { return []; }
};
export const STORE_ID        = () => getSetting('store-id','');
export const ONBOARDING_DONE = () => getSetting('onboarding-done','') === 'true';
export const MASTER_PIN      = '2202';

// ─── LICENSE ─────────────────────────────────────────────────────────────────
/**
 * Valida un código de activación.
 * Formato base: BAS-NNNN | EST-NNNN | PRE-NNNN
 * Extensiones opcionales: -ID-<storeid> -EXP-YYYYMMDD
 */
export function validateCode(raw: string): LicenseInfo | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase().replace(/\s/g,'');
  const parts = code.split('-');
  if (parts.length < 2) return null;
  const prefix = parts[0];
  const num    = parts[1];
  if (!/^\d{4}$/.test(num)) return null;
  const digitSum = num.split('').reduce((s,d) => s + parseInt(d, 10), 0);
  const planMods: Record<string,number> = { BAS:2, EST:4, PRE:6 };
  if (planMods[prefix] === undefined || digitSum % 7 !== planMods[prefix]) return null;
  const levels: Record<string,number> = { BAS:1, EST:2, PRE:3 };
  const level = levels[prefix] ?? 0;

  let storeId = '';
  let expiresAt: number | undefined;
  for (let i = 2; i < parts.length - 1; i++) {
    if (parts[i] === 'ID') {
      storeId = (parts[i+1] || '').toLowerCase();
    } else if (parts[i] === 'EXP') {
      const d = parts[i+1] || '';
      if (/^\d{8}$/.test(d)) {
        const t = new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00`).getTime();
        if (!Number.isNaN(t)) expiresAt = t;
      }
    }
  }
  return { level, storeId, expiresAt };
}

export function isLicenseExpired(): boolean {
  const exp = parseInt(getSetting('plan-expires-at','0'), 10);
  return exp > 0 && Date.now() > exp;
}

export function planName(level: number) {
  return ['Sin activar','Básico','Estándar','Premium'][level] ?? 'Sin activar';
}
export function planFeatures(level: number) {
  if (level === 3) return 'Venta · Stock · Reportes · Categorías · Deudas · PIN empleado · Sesiones';
  if (level === 2) return 'Venta · Stock · Reportes · Categorías · Deudas';
  return 'Venta · Stock · Historial · Backup';
}

export function formatMoney(n: number) {
  return '$' + Number(n).toLocaleString('es-AR',{ minimumFractionDigits:2, maximumFractionDigits:2 });
}

// ─── TURSO CONFIG ────────────────────────────────────────────────────────────
const TURSO_URL   = import.meta.env.VITE_TURSO_URL   as string | undefined;
const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN as string | undefined;
export const TURSO_ENABLED = !!(TURSO_URL && TURSO_TOKEN);

/** Mapea un valor JS al protocolo de tipos de libsql/Turso. */
function tursoArg(v: unknown): { type: string; value: string } | { type: 'null' } {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? { type: 'integer', value: String(v) }
      : { type: 'float',   value: String(v) };
  }
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  return { type: 'text', value: String(v) };
}

async function tursoExec(sql: string, args: unknown[] = []) {
  if (!TURSO_ENABLED) return null;
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        { type:'execute', stmt:{ sql, args: args.map(tursoArg) } },
        { type:'close' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}`);
  return res.json();
}

async function tursoInitSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, nombre TEXT, barcode TEXT, categoria TEXT, price REAL, stock INTEGER, stockMinimo INTEGER, store_id TEXT, updated_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS sales    (id INTEGER PRIMARY KEY, data TEXT, store_id TEXT, created INTEGER)`,
    `CREATE TABLE IF NOT EXISTS debts    (id INTEGER PRIMARY KEY, data TEXT, store_id TEXT, created INTEGER)`,
    `CREATE TABLE IF NOT EXISTS settings_remote (store_id TEXT, k TEXT, v TEXT, PRIMARY KEY(store_id,k))`,
  ];
  for (const sql of stmts) await tursoExec(sql);
}

// ─── OFFLINE SYNC QUEUE ──────────────────────────────────────────────────────
// queueListener permite a la UI saber cuántos items hay pendientes.
let queueListener: ((n: number) => void) | null = null;
export function _setQueueListener(fn: ((n: number) => void) | null) { queueListener = fn; }

async function notifyQueueLength() {
  if (!queueListener || !dbInstance) return;
  try { queueListener(await dbCount('syncQueue')); } catch {/* ignore */}
}

async function enqueue(item: Omit<SyncQueueItem,'id'|'retries'|'createdAt'>) {
  await dbAdd('syncQueue', { ...item, retries:0, createdAt: Date.now() });
  notifyQueueLength();
}

let flushInProgress = false;

export async function flushSyncQueue() {
  if (!TURSO_ENABLED || flushInProgress) return;
  flushInProgress = true;
  try {
    await tursoInitSchema();
    const queue: SyncQueueItem[] = await dbGetAll('syncQueue');
    if (queue.length === 0) return;

    const storeId = STORE_ID();
    for (const item of queue) {
      try {
        if (item.store === 'products' && item.op === 'upsert') {
          const p = item.payload as Producto;
          await tursoExec(
            `INSERT OR REPLACE INTO products (id,nombre,barcode,categoria,price,stock,stockMinimo,store_id,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [p.id, p.nombre, p.barcode, p.categoria ?? '', p.price, p.stock, p.stockMinimo ?? 0, storeId, p.updatedAt ?? Date.now()]
          );
        } else if (item.store === 'products' && item.op === 'delete') {
          await tursoExec(`DELETE FROM products WHERE id=? AND store_id=?`, [item.recordId, storeId]);
        } else if (item.store === 'sales' && item.op === 'upsert') {
          const s = item.payload as Sale;
          await tursoExec(
            `INSERT OR REPLACE INTO sales (id,data,store_id,created) VALUES (?,?,?,?)`,
            [s.id, JSON.stringify(s), storeId, s.created]
          );
        } else if (item.store === 'debts' && item.op === 'upsert') {
          const d = item.payload as Debt;
          await tursoExec(
            `INSERT OR REPLACE INTO debts (id,data,store_id,created) VALUES (?,?,?,?)`,
            [d.id, JSON.stringify(d), storeId, d.created]
          );
        } else if (item.store === 'debts' && item.op === 'delete') {
          await tursoExec(`DELETE FROM debts WHERE id=? AND store_id=?`, [item.recordId, storeId]);
        } else if (item.store === 'settings_remote' && item.op === 'upsert') {
          const { k, v } = item.payload as { k: string; v: string };
          await tursoExec(`INSERT OR REPLACE INTO settings_remote (store_id,k,v) VALUES (?,?,?)`, [storeId, k, v]);
        }
        await dbDelete('syncQueue', item.id!);
      } catch (err) {
        if (item.retries < 5) {
          await dbPut('syncQueue', { ...item, retries: item.retries + 1 });
        } else {
          console.error('Sync item failed permanently, dropping:', item, err);
          await dbDelete('syncQueue', item.id!);
        }
      }
    }
    setSetting('last-sync', Date.now().toString());
  } finally {
    flushInProgress = false;
    notifyQueueLength();
  }
}

function scheduleSync() {
  if (!TURSO_ENABLED) return;
  setTimeout(() => { flushSyncQueue().catch(() => {}); }, 2000);
}

// ─── PURGE ───────────────────────────────────────────────────────────────────
export async function purgeOldSales() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const all = await dbGetAll<Sale>('sales');
  for (const s of all) {
    if (s.created < cutoff) await dbDelete('sales', s.id!);
  }
}

// ─── ATOMIC SALE TRANSACTION ─────────────────────────────────────────────────
// Stock update + sale record en la MISMA transacción IDB. Si falla cualquier
// paso, la transacción se aborta y nada se persiste.
export async function commitSaleAtomic(
  cart: Array<{ id: number; name: string; barcode: string; price: number; qty: number }>,
  saleData: Omit<Sale, 'id' | 'stockMovements' | 'items'>,
  _products: Producto[], // mantenido por compat, no se usa (leemos de la tx)
): Promise<{ sale: Sale; updatedProducts: Producto[] }> {
  if (!dbInstance) throw new Error('DB not initialized');
  if (cart.length === 0) throw new Error('Cart is empty');

  return new Promise((resolve, reject) => {
    const tx = dbInstance!.transaction(['products','sales'], 'readwrite');
    const productStore = tx.objectStore('products');
    const saleStore    = tx.objectStore('sales');

    const updatedProducts: Producto[] = [];
    const stockMovements: Sale['stockMovements'] = [];
    const saleItems: Sale['items'] = [];
    let pending = cart.length;
    let errored = false;

    const fail = (err: unknown) => {
      if (errored) return;
      errored = true;
      try { tx.abort(); } catch {/* tx ya muerta */}
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    for (const item of cart) {
      const getReq = productStore.get(item.id);
      getReq.onerror   = () => fail(getReq.error);
      getReq.onsuccess = () => {
        if (errored) return;
        const p: Producto | undefined = getReq.result;
        if (!p) { fail(new Error(`Producto ${item.name} no encontrado`)); return; }
        const before   = p.stock;
        const deducted = Math.min(item.qty, before);
        const updated  = { ...p, stock: Math.max(0, p.stock - item.qty), updatedAt: Date.now() };

        const putReq = productStore.put(updated);
        putReq.onerror   = () => fail(putReq.error);
        putReq.onsuccess = () => {
          if (errored) return;
          updatedProducts.push(updated);
          stockMovements.push({ name: item.name, requested: item.qty, deducted, before, after: updated.stock });
          saleItems.push({ name: item.name, qty: item.qty, price: item.price, productId: item.id });

          pending--;
          if (pending > 0) return;

          const sale: Omit<Sale,'id'> = { ...saleData, items: saleItems, stockMovements };
          const addReq = saleStore.add(sale);
          addReq.onerror   = () => fail(addReq.error);
          addReq.onsuccess = () => {
            if (errored) return;
            resolve({ sale: { ...sale, id: addReq.result as number }, updatedProducts });
          };
        };
      };
    }

    tx.onerror = () => fail(tx.error);
    tx.onabort = () => { if (!errored) fail(new Error('Transaction aborted')); };
  });
}

// ─── REDUCER ─────────────────────────────────────────────────────────────────
interface StoreState {
  productos: Producto[];
  sales: Sale[];
  debts: Debt[];
  loading: boolean;
  syncQueueLength: number;
}

type Action =
  | { type: 'INIT'; productos: Producto[]; sales: Sale[]; debts: Debt[] }
  | { type: 'ADD_PRODUCTO';     payload: Producto }
  | { type: 'UPDATE_PRODUCTO';  payload: Producto }
  | { type: 'UPDATE_PRODUCTOS'; payload: Producto[] }
  | { type: 'DELETE_PRODUCTO';  payload: number }
  | { type: 'ADD_SALE';         payload: Sale }
  | { type: 'ADD_DEBT';         payload: Debt }
  | { type: 'DELETE_DEBT';      payload: number }
  | { type: 'SET_LOADING';      payload: boolean }
  | { type: 'SET_QUEUE_LEN';    payload: number };

const init: StoreState = { productos:[], sales:[], debts:[], loading:true, syncQueueLength:0 };

export function reducer(s: StoreState, a: Action): StoreState {
  switch (a.type) {
    case 'INIT':          return { ...s, productos:a.productos, sales:a.sales, debts:a.debts, loading:false };
    case 'ADD_PRODUCTO':  return { ...s, productos:[...s.productos, a.payload] };
    case 'UPDATE_PRODUCTO': return { ...s, productos: s.productos.map(p => p.id===a.payload.id ? a.payload : p) };
    case 'UPDATE_PRODUCTOS': {
      const byId = new Map(a.payload.map(p => [p.id, p]));
      return { ...s, productos: s.productos.map(p => byId.get(p.id) ?? p) };
    }
    case 'DELETE_PRODUCTO': return { ...s, productos: s.productos.filter(p => p.id!==a.payload) };
    case 'ADD_SALE':      return { ...s, sales:[a.payload, ...s.sales] };
    case 'ADD_DEBT':      return { ...s, debts:[a.payload, ...s.debts] };
    case 'DELETE_DEBT':   return { ...s, debts: s.debts.filter(d => d.id!==a.payload) };
    case 'SET_LOADING':   return { ...s, loading:a.payload };
    case 'SET_QUEUE_LEN': return { ...s, syncQueueLength:a.payload };
    default: return s;
  }
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
interface StoreCtx {
  state: StoreState;
  addProduct:          (p: Omit<Producto,'id'>) => Promise<Producto>;
  updateProduct:       (p: Producto) => Promise<void>;
  deleteProduct:       (id: number) => Promise<void>;
  executeSale:         (cart: Array<{id:number;name:string;barcode:string;price:number;qty:number}>, meta: Omit<Sale,'id'|'stockMovements'|'items'>) => Promise<Sale>;
  addDebt:             (d: Omit<Debt,'id'>) => Promise<Debt>;
  deleteDebt:          (id: number) => Promise<void>;
  getProductByBarcode: (b: string) => Producto | undefined;
  getProductById:      (id: number) => Producto | undefined;
  syncNow:             () => Promise<void>;
}

const StoreContext = createContext<StoreCtx | undefined>(undefined);

export const StoreProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, init);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await openDB();
      await loadAllSettings();
      await migrateLocalStorage();
      await purgeOldSales();
      const [productos, sales, debts] = await Promise.all([
        dbGetAll<Producto>('products'),
        dbGetAll<Sale>('sales'),
        dbGetAll<Debt>('debts'),
      ]);
      if (cancelled) return;
      dispatch({ type:'INIT', productos, sales, debts });
      _setQueueListener(n => dispatch({ type:'SET_QUEUE_LEN', payload: n }));
      notifyQueueLength();
      scheduleSync();
    })();

    const onOnline = () => flushSyncQueue().catch(()=>{});
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      _setQueueListener(null);
    };
  }, []);

  const addProduct = useCallback(async (p: Omit<Producto,'id'>) => {
    const withTs = { ...p, updatedAt: Date.now() };
    const id     = await dbAdd('products', withTs);
    const newP   = { ...withTs, id };
    dispatch({ type:'ADD_PRODUCTO', payload: newP });
    await enqueue({ store:'products', op:'upsert', recordId:id, payload:newP });
    scheduleSync();
    return newP;
  }, []);

  const updateProduct = useCallback(async (p: Producto) => {
    if (p.id === undefined) throw new Error('updateProduct: id requerido');
    const withTs = { ...p, updatedAt: Date.now() };
    await dbPut('products', withTs);
    dispatch({ type:'UPDATE_PRODUCTO', payload: withTs });
    await enqueue({ store:'products', op:'upsert', recordId:p.id, payload:withTs });
    scheduleSync();
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await dbDelete('products', id);
    dispatch({ type:'DELETE_PRODUCTO', payload: id });
    await enqueue({ store:'products', op:'delete', recordId:id, payload:null });
    scheduleSync();
  }, []);

  const executeSale = useCallback(async (
    cart: Array<{id:number;name:string;barcode:string;price:number;qty:number}>,
    meta: Omit<Sale,'id'|'stockMovements'|'items'>
  ) => {
    const { sale, updatedProducts } = await commitSaleAtomic(cart, meta, state.productos);
    dispatch({ type:'ADD_SALE', payload: sale });
    dispatch({ type:'UPDATE_PRODUCTOS', payload: updatedProducts });
    await enqueue({ store:'sales', op:'upsert', recordId:sale.id!, payload:sale });
    for (const p of updatedProducts)
      await enqueue({ store:'products', op:'upsert', recordId:p.id!, payload:p });
    scheduleSync();
    return sale;
  }, [state.productos]);

  const addDebt = useCallback(async (d: Omit<Debt,'id'>) => {
    const id   = await dbAdd('debts', d);
    const newD = { ...d, id };
    dispatch({ type:'ADD_DEBT', payload: newD });
    await enqueue({ store:'debts', op:'upsert', recordId:id, payload:newD });
    scheduleSync();
    return newD;
  }, []);

  const deleteDebt = useCallback(async (id: number) => {
    await dbDelete('debts', id);
    dispatch({ type:'DELETE_DEBT', payload: id });
    await enqueue({ store:'debts', op:'delete', recordId:id, payload:null });
    scheduleSync();
  }, []);

  const getProductByBarcode = useCallback((b: string) =>
    state.productos.find(p => p.barcode === b), [state.productos]);
  const getProductById = useCallback((id: number) =>
    state.productos.find(p => p.id === id), [state.productos]);

  const syncNow = useCallback(async () => {
    await flushSyncQueue();
    if (TURSO_ENABLED && STORE_ID()) {
      const keys = ['store-name','stock-threshold','categories','plan-level','plan-expires-at'];
      for (const k of keys)
        await enqueue({ store:'settings_remote', op:'upsert', recordId:k, payload:{ k, v:getSetting(k) } });
      await flushSyncQueue();
    }
  }, []);

  return (
    <StoreContext.Provider value={{ state, addProduct, updateProduct, deleteProduct, executeSale, addDebt, deleteDebt, getProductByBarcode, getProductById, syncNow }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
};
