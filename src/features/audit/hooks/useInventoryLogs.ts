import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import type { InventoryLogWithProduct } from '../../../types/database';

export interface UseInventoryLogsReturn {
  logs: InventoryLogWithProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryLogs(): UseInventoryLogsReturn {
  const [logs, setLogs] = useState<InventoryLogWithProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setError(null);
    const { data, error: fetchError } = await supabase
      .from('inventory_logs')
      .select('*, products ( name, barcode, category )')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setLogs(data as unknown as InventoryLogWithProduct[]);
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
      .channel('inventory-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_logs' },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [refetch]);

  return { logs, loading, error, refetch };
}
