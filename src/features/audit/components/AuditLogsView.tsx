import { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import type { InventoryLogType, InventoryLogWithProduct } from '../../../types/database';

interface AuditLogsViewProps {
  logs: InventoryLogWithProduct[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

type AuditFilter = 'all' | 'discrepancies' | 'audit';

const TYPE_LABELS: Record<InventoryLogType, string> = {
  audit: 'Recuento',
  manual_adjustment: 'Ajuste manual',
  restock: 'Reposición',
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AuditLogsView({ logs, loading, error, onRefresh }: AuditLogsViewProps) {
  const [filter, setFilter] = useState<AuditFilter>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filter === 'discrepancies') return log.difference !== 0;
      if (filter === 'audit') return log.type === 'audit';
      return true;
    });
  }, [logs, filter]);

  const discrepanciesCount = useMemo(
    () => logs.filter((log) => log.difference !== 0).length,
    [logs],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
            Descuadres e Historial
          </h1>
          <p className="text-xs text-zinc-500">
            Últimos recuentos desde móvil y ajustes de stock ({discrepanciesCount} con diferencia).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'all', label: `Todos (${logs.length})` },
            { id: 'discrepancies', label: `Solo descuadres (${discrepanciesCount})` },
            { id: 'audit', label: 'Recuentos móvil' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
              filter === tab.id
                ? 'border-zinc-950 bg-zinc-950 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          Error cargando historial: {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
          Cargando historial de recuentos...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-900">Sin movimientos registrados</p>
          <p className="mt-1 text-xs text-zinc-500">
            Cuando realices un recuento desde el móvil o edites el stock aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  <th className="py-2.5 pr-3 pl-4">Producto</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Tipo</th>
                  <th className="px-3 py-2.5 text-right">Movimiento</th>
                  <th className="px-3 py-2.5 text-right">Diferencia</th>
                  <th className="hidden py-2.5 pr-4 pl-3 text-right md:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isNegative = log.difference < 0;
                  const isPositive = log.difference > 0;

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/70"
                    >
                      <td className="py-3 pr-3 pl-4">
                        <p className="text-sm font-medium text-zinc-950">
                          {log.products?.name ?? 'Producto eliminado'}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                          <span className="font-mono">{log.products?.barcode ?? '—'}</span>
                          <span className="md:hidden">· {formatDateTime(log.created_at)}</span>
                        </div>
                      </td>

                      <td className="hidden px-3 py-3 sm:table-cell">
                        <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                          {TYPE_LABELS[log.type]}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-600">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span>{log.previous_stock}</span>
                          <ArrowRight className="h-3 w-3 text-zinc-400" />
                          <span className="font-semibold text-zinc-950">{log.counted_stock}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span
                          className={`inline-flex min-w-[3rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                            isNegative
                              ? 'bg-red-50 text-red-700'
                              : isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {isPositive ? `+${log.difference}` : log.difference}
                        </span>
                      </td>

                      <td className="hidden py-3 pr-4 pl-3 text-right text-xs tabular-nums text-zinc-500 md:table-cell">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
