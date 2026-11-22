import type { ProductLocation } from '../config/appConfig';

export type InventoryLogType = 'audit' | 'manual_adjustment' | 'restock';

export type Product = {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  location: ProductLocation;
  stock_current: number;
  stock_min: number;
  updated_at: string;
};

export type ProductInsert = {
  id?: string;
  barcode: string;
  name: string;
  category?: string | null;
  location?: ProductLocation;
  stock_current?: number;
  stock_min?: number;
  updated_at?: string;
};

export type ProductUpdate = {
  id?: string;
  barcode?: string;
  name?: string;
  category?: string | null;
  location?: ProductLocation;
  stock_current?: number;
  stock_min?: number;
  updated_at?: string;
};

export type ProductBarcode = {
  id: string;
  product_id: string;
  barcode: string;
  variant_label: string | null;
  created_at: string;
};

export type ProductBarcodeInsert = {
  id?: string;
  product_id: string;
  barcode: string;
  variant_label?: string | null;
  created_at?: string;
};

export type ProductWithBarcodes = Product & {
  barcodes: string[];
};

export type InventoryLog = {
  id: string;
  product_id: string;
  previous_stock: number;
  counted_stock: number;
  difference: number;
  type: InventoryLogType;
  created_at: string;
};

export type InventoryLogInsert = {
  id?: string;
  product_id: string;
  previous_stock: number;
  counted_stock: number;
  type: InventoryLogType;
  created_at?: string;
};

export type InventoryLogWithProduct = InventoryLog & {
  products: Pick<Product, 'name' | 'barcode' | 'category'> | null;
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      product_barcodes: {
        Row: ProductBarcode;
        Insert: ProductBarcodeInsert;
        Update: Partial<ProductBarcodeInsert>;
        Relationships: [
          {
            foreignKeyName: 'product_barcodes_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      inventory_logs: {
        Row: InventoryLog;
        Insert: InventoryLogInsert;
        Update: Partial<InventoryLogInsert>;
        Relationships: [
          {
            foreignKeyName: 'inventory_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
