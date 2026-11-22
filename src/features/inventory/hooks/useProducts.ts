import { useCallback, useEffect, useState } from 'react';
import { appConfig } from '../../../config/appConfig';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import type {
  InventoryLogType,
  Product,
  ProductInsert,
  ProductWithBarcodes,
} from '../../../types/database';

type ProductRowWithRelation = Product & {
  product_barcodes?: { barcode: string }[];
};

export type CommitScannerSessionPayload =
  | {
      kind: 'existing';
      product: ProductWithBarcodes;
      countedStock: number;
      newBarcodes: string[];
    }
  | {
      kind: 'new';
      name: string;
      category?: string | null;
      stockMin?: number;
      countedStock: number;
      barcodes: string[];
    };

export interface UseProductsReturn {
  products: ProductWithBarcodes[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  findByBarcode: (barcode: string) => ProductWithBarcodes | undefined;
  createProduct: (input: ProductInsert, extraBarcodes?: string[]) => Promise<ProductWithBarcodes>;
  updateStock: (
    product: ProductWithBarcodes,
    newStock: number,
    type?: InventoryLogType,
  ) => Promise<ProductWithBarcodes>;
  commitScannerSession: (payload: CommitScannerSessionPayload) => Promise<ProductWithBarcodes>;
  deleteProduct: (id: string) => Promise<void>;
}

function normalizeProduct(row: ProductRowWithRelation): ProductWithBarcodes {
  const codeSet = new Set<string>();
  if (row.barcode?.trim()) {
    codeSet.add(row.barcode.trim());
  }
  if (Array.isArray(row.product_barcodes)) {
    for (const item of row.product_barcodes) {
      if (item.barcode?.trim()) {
        codeSet.add(item.barcode.trim());
      }
    }
  }
  const { product_barcodes: _ignored, ...base } = row;
  void _ignored;
  return {
    ...base,
    barcodes: Array.from(codeSet),
  };
}

function uniqueCleanBarcodes(codes: string[]): string[] {
  return Array.from(new Set(codes.map((c) => c.trim()).filter(Boolean)));
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<ProductWithBarcodes[]>([]);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    setError(null);
    const { data, error: fetchError } = await client
      .from('products')
      .select('*, product_barcodes ( barcode )')
      .order('name', { ascending: true });

    if (fetchError) {
      // Fallback limpio si la tabla product_barcodes todavía no se ha creado
      if (fetchError.message.includes('product_barcodes')) {
        const { data: fallbackData, error: fallbackError } = await client
          .from('products')
          .select('*')
          .order('name', { ascending: true });
        if (fallbackError) {
          setError(fallbackError.message);
        } else if (fallbackData) {
          setProducts(fallbackData.map((row) => normalizeProduct(row)));
        }
      } else {
        setError(fetchError.message);
      }
    } else if (data) {
      setProducts((data as unknown as ProductRowWithRelation[]).map(normalizeProduct));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('products-and-barcodes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          void refetch();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_barcodes' },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [refetch]);

  const findByBarcode = useCallback(
    (barcode: string) => {
      const normalized = barcode.trim();
      if (!normalized) return undefined;
      return products.find(
        (p) => p.barcode === normalized || p.barcodes.includes(normalized),
      );
    },
    [products],
  );

  const upsertProductBarcodes = useCallback(async (productId: string, codes: string[]) => {
    const client = supabase;
    if (!client) return;
    const clean = uniqueCleanBarcodes(codes);
    if (clean.length === 0) return;

    const rows = clean.map((barcode) => ({
      product_id: productId,
      barcode,
    }));

    const { error: upsertError } = await client
      .from('product_barcodes')
      .upsert(rows, { onConflict: 'barcode', ignoreDuplicates: true });

    if (upsertError) {
      throw new Error(`No se pudieron asociar los códigos de barras: ${upsertError.message}`);
    }
  }, []);

  const createProduct = useCallback(
    async (input: ProductInsert, extraBarcodes: string[] = []): Promise<ProductWithBarcodes> => {
      const client = supabase;
      if (!client) {
        throw new Error('Supabase no está configurado. Revisa tus variables de entorno.');
      }

      const primaryBarcode = input.barcode.trim();
      const allCodes = uniqueCleanBarcodes([primaryBarcode, ...extraBarcodes]);

      const payload: ProductInsert = {
        barcode: primaryBarcode,
        name: input.name.trim(),
        category: input.category?.trim() || null,
        stock_current: Math.max(0, Math.floor(input.stock_current ?? 0)),
        stock_min: Math.max(0, Math.floor(input.stock_min ?? appConfig.DEFAULT_STOCK_MIN)),
      };

      const { data, error: insertError } = await client
        .from('products')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`Ya existe un producto con el código ${payload.barcode}.`);
        }
        throw new Error(insertError.message);
      }

      await upsertProductBarcodes(data.id, allCodes);

      const created: ProductWithBarcodes = {
        ...data,
        barcodes: allCodes,
      };

      setProducts((prev) => {
        if (prev.some((item) => item.id === created.id)) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });

      if (data.stock_current > 0) {
        await client.from('inventory_logs').insert({
          product_id: data.id,
          previous_stock: 0,
          counted_stock: data.stock_current,
          type: 'restock',
        });
      }

      return created;
    },
    [upsertProductBarcodes],
  );

  const updateStock = useCallback(
    async (
      product: ProductWithBarcodes,
      newStock: number,
      type?: InventoryLogType,
    ): Promise<ProductWithBarcodes> => {
      const client = supabase;
      if (!client) {
        throw new Error('Supabase no está configurado.');
      }

      const sanitized = Math.max(0, Math.floor(newStock));
      const previous = product.stock_current;
      const logType: InventoryLogType =
        type ?? (sanitized > previous ? 'restock' : 'manual_adjustment');

      const { data, error: updateError } = await client
        .from('products')
        .update({ stock_current: sanitized })
        .eq('id', product.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      const updated: ProductWithBarcodes = {
        ...data,
        barcodes: product.barcodes,
      };

      setProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );

      const { error: logError } = await client.from('inventory_logs').insert({
        product_id: product.id,
        previous_stock: previous,
        counted_stock: sanitized,
        type: logType,
      });

      if (logError) {
        console.error('Error al registrar en inventory_logs:', logError.message);
      }

      return updated;
    },
    [],
  );

  const commitScannerSession = useCallback(
    async (payload: CommitScannerSessionPayload): Promise<ProductWithBarcodes> => {
      const client = supabase;
      if (!client) {
        throw new Error('Supabase no está configurado.');
      }

      if (payload.kind === 'new') {
        const cleanCodes = uniqueCleanBarcodes(payload.barcodes);
        if (cleanCodes.length === 0) {
          throw new Error('Necesitas al menos un código de barras para guardar el producto.');
        }

        const primaryBarcode = cleanCodes[0];
        const sanitizedStock = Math.max(0, Math.floor(payload.countedStock));

        const { data, error: insertError } = await client
          .from('products')
          .insert({
            barcode: primaryBarcode,
            name: payload.name.trim(),
            category: payload.category?.trim() || null,
            stock_current: sanitizedStock,
            stock_min: Math.max(0, Math.floor(payload.stockMin ?? appConfig.DEFAULT_STOCK_MIN)),
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error(`El código ${primaryBarcode} ya está registrado en otro producto.`);
          }
          throw new Error(insertError.message);
        }

        await upsertProductBarcodes(data.id, cleanCodes);

        const { error: logError } = await client.from('inventory_logs').insert({
          product_id: data.id,
          previous_stock: 0,
          counted_stock: sanitizedStock,
          type: 'audit',
        });
        if (logError) {
          console.error('Error al registrar recuento inicial:', logError.message);
        }

        const created: ProductWithBarcodes = {
          ...data,
          barcodes: cleanCodes,
        };

        setProducts((prev) => {
          const filtered = prev.filter((item) => item.id !== created.id);
          return [...filtered, created].sort((a, b) => a.name.localeCompare(b.name));
        });

        return created;
      }

      // Producto existente: vincular nuevos sabores/códigos + actualizar stock + log de recuento
      const cleanNewCodes = uniqueCleanBarcodes(payload.newBarcodes);
      if (cleanNewCodes.length > 0) {
        await upsertProductBarcodes(payload.product.id, cleanNewCodes);
      }

      const mergedBarcodes = uniqueCleanBarcodes([
        ...payload.product.barcodes,
        ...cleanNewCodes,
      ]);

      const updated = await updateStock(
        { ...payload.product, barcodes: mergedBarcodes },
        payload.countedStock,
        'audit',
      );

      return updated;
    },
    [updateStock, upsertProductBarcodes],
  );

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    const client = supabase;
    if (!client) {
      throw new Error('Supabase no está configurado.');
    }

    const { error: deleteError } = await client.from('products').delete().eq('id', id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setProducts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    products,
    loading,
    error,
    refetch,
    findByBarcode,
    createProduct,
    updateStock,
    commitScannerSession,
    deleteProduct,
  };
}
