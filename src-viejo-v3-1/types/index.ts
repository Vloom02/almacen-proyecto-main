// ─── Core entities ─────────────────────────────────────────────────────────
export interface Producto {
  id?: number;
  nombre: string;
  barcode: string;
  categoria?: string;
  price: number;
  stock: number;
  stockMinimo?: number;
  updatedAt?: number; // timestamp for conflict resolution
}

export interface SaleItem {
  name: string;
  qty: number;
  price: number;
  productId?: number;
}

export interface StockMovement {
  name: string;
  requested: number;
  deducted: number;
  before: number;
  after: number;
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  total: number;
  discount: number;
  payMethod: 'cash' | 'transfer' | 'card';
  customer: string;
  fiado: boolean;
  employee: string | null;
  stockMovements: StockMovement[];
  created: number;
  synced?: boolean;
}

export interface Debt {
  id?: number;
  customer: string;
  amount: number;
  items: SaleItem[];
  created: number;
  synced?: boolean;
}

// ─── Offline sync queue ────────────────────────────────────────────────────
export type SyncOpType = 'upsert' | 'delete';
export type SyncStore  = 'products' | 'sales' | 'debts' | 'settings_remote';

export interface SyncQueueItem {
  id?: number;
  store: SyncStore;
  op: SyncOpType;
  recordId: number | string;
  payload: unknown;
  createdAt: number;
  retries: number;
}

// ─── Activation ────────────────────────────────────────────────────────────
export interface LicenseInfo {
  level: number;
  storeId: string;
  expiresAt?: number; // epoch ms — optional, null = permanent
}

// ─── History filters ───────────────────────────────────────────────────────
export interface HistoryFilters {
  employee: string;   // '' = all
  payMethod: string;  // '' = all
  customer: string;
  dateFrom: string;   // ISO date
  dateTo: string;     // ISO date
}

// ─── Misc ──────────────────────────────────────────────────────────────────
export type Role        = 'owner' | 'employee';
export type PlanLevel   = 0 | 1 | 2 | 3;
export interface Employee { name: string; pin: string; }

export type SettingKey =
  | 'store-name' | 'stock-threshold' | 'categories'
  | 'plan-level' | 'plan-expires-at' | 'store-id'
  | 'pin-owner'  | 'employees'       | 'pin-employee'
  | 'theme'      | 'last-backup'     | 'backup-snoozed'
  | 'last-sync'  | 'onboarding-done';
