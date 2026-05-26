export interface Categoria {
  id?: number;
  nombre: string;
  descripcion: string;
}

export interface Proveedor {
  id?: number;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Producto {
  id?: number;
  nombre: string;
  barcode: string;
  categoria: string;
  price: number;
  stock: number;
  stockMinimo?: number;
}

export interface SaleItem {
  name: string;
  qty: number;
  price: number;
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
}

export interface Debt {
  id?: number;
  customer: string;
  amount: number;
  items: SaleItem[];
  created: number;
}

export type Role = 'owner' | 'employee';
export type PlanLevel = 0 | 1 | 2 | 3;

export interface Settings {
  'store-name': string;
  'stock-threshold': string;
  'categories': string;
  'plan-level': string;
  'pin-owner': string;
  'employees': string;
  'pin-employee': string;
  'theme': string;
  'last-backup': string;
  'backup-snoozed': string;
}