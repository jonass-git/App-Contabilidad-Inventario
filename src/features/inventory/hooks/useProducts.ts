import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import type { InventoryLogType, Product, ProductInsert } from '../../../types/database';

export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  findByBarcode: (barcode: string) => Product | undefined;
  createProduct: (input: ProductInsert) => Promise<Product>;
  updateStock: (
    product: Product,
    newStock: number,
    type?: InventoryLogType,
  ) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setError(null);
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setProducts(data);
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
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Product;
            setProducts((prev) => {
              if (prev.some((item) => item.id === inserted.id)) return prev;
              return [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Product;
            setProducts((prev) =>
              prev
                .map((item) => (item.id === updated.id ? updated : item))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string }).id;
            if (deletedId) {
              setProducts((prev) => prev.filter((item) => item.id !== deletedId));
            }
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const findByBarcode = useCallback(
    (barcode: string) => {
      const normalized = barcode.trim();
      return products.find((p) => p.barcode === normalized);
    },
    [products],
  );

  const createProduct = useCallback(async (input: ProductInsert): Promise<Product> => {
    if (!supabase) {
      throw new Error('Supabase no está configurado. Revisa tus variables de entorno.');
    }

    const payload: ProductInsert = {
      barcode: input.barcode.trim(),
      name: input.name.trim(),
      category: input.category?.trim() || null,
      stock_current: Math.max(0, Math.floor(input.stock_current ?? 0)),
      stock_min: Math.max(0, Math.floor(input.stock_min ?? 5)),
    };

    const { data, error: insertError } = await supabase
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

    setProducts((prev) => {
      if (prev.some((item) => item.id === data.id)) return prev;
      return [...prev, data].sort((a, b) => a.name.localeCompare(b.name));
    });

    if (data.stock_current > 0) {
      await supabase.from('inventory_logs').insert({
        product_id: data.id,
        previous_stock: 0,
        counted_stock: data.stock_current,
        type: 'restock',
      });
    }

    return data;
  }, []);

  const updateStock = useCallback(
    async (
      product: Product,
      newStock: number,
      type?: InventoryLogType,
    ): Promise<Product> => {
      if (!supabase) {
        throw new Error('Supabase no está configurado.');
      }

      const sanitized = Math.max(0, Math.floor(newStock));
      const previous = product.stock_current;
      const logType: InventoryLogType =
        type ?? (sanitized > previous ? 'restock' : 'manual_adjustment');

      const { data, error: updateError } = await supabase
        .from('products')
        .update({ stock_current: sanitized })
        .eq('id', product.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      setProducts((prev) =>
        prev.map((item) => (item.id === data.id ? data : item)),
      );

      const { error: logError } = await supabase.from('inventory_logs').insert({
        product_id: product.id,
        previous_stock: previous,
        counted_stock: sanitized,
        type: logType,
      });

      if (logError) {
        console.error('Error al registrar en inventory_logs:', logError.message);
      }

      return data;
    },
    [],
  );

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    if (!supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

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
    deleteProduct,
  };
}
