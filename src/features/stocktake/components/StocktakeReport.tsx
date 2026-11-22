import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  MapPin,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import type { ProductLocation } from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';

export interface StocktakeDiscrepancyRow {
  product: ProductWithBarcodes;
  expected: number;
  counted: number;
  wasCounted: boolean;
  difference: number; // counted - expected (<0 falta, >0 sobra, 0 cuadra)
}

interface StocktakeReportProps {
  products: ProductWithBarcodes[];
  countedMap: Record<string, number>;
  locationFilter: ProductLocation | 'all';
  onBackToEdit: () => void;
  onReset: () => void;
}

type ReportFilter = 'all' | 'discrepancies' | 'missing' | 'surplus' | 'exact';

export function StocktakeReport({
  products,
  countedMap,
  locationFilter,
  onBackToEdit,
  onReset,
}: StocktakeReportProps) {
  const [includeUncountedAsZero, setIncludeUncountedAsZero] = useState(true);
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [copied, setCopied] = useState(false);

  const allRows: StocktakeDiscrepancyRow[] = useMemo(() => {
    const rows = products
      .filter((product) => includeUncountedAsZero || Object.prototype.hasOwnProperty.call(countedMap, product.id))
      .map((product) => {
        const wasCounted = Object.prototype.hasOwnProperty.call(countedMap, product.id);
        const counted = wasCounted ? countedMap[product.id] : 0;
        const expected = product.stock_current;
        return {
          product,
          expected,
          counted,
          wasCounted,
          difference: counted - expected,
        };
      });

    // Ordenar mostrando primero las mayores discrepancias
    return rows.sort((a, b) => {
      const absDiff = Math.abs(b.difference) - Math.abs(a.difference);
      if (absDiff !== 0) return absDiff;
      return a.product.name.localeCompare(b.product.name);
    });
  }, [products, countedMap, includeUncountedAsZero]);

  const summary = useMemo(() => {
    let exactCount = 0;
    let missingProducts = 0;
    let missingUnits = 0;
    let surplusProducts = 0;
    let surplusUnits = 0;

    for (const row of allRows) {
      if (row.difference === 0) {
        exactCount += 1;
      } else if (row.difference < 0) {
        missingProducts += 1;
        missingUnits += Math.abs(row.difference);
      } else {
        surplusProducts += 1;
        surplusUnits += row.difference;
      }
    }

    return {
      total: allRows.length,
      exactCount,
      missingProducts,
      missingUnits,
      surplusProducts,
      surplusUnits,
      discrepanciesCount: missingProducts + surplusProducts,
    };
  }, [allRows]);

  const visibleRows = useMemo(() => {
    return allRows.filter((row) => {
      if (filter === 'discrepancies') return row.difference !== 0;
      if (filter === 'missing') return row.difference < 0;
      if (filter === 'surplus') return row.difference > 0;
      if (filter === 'exact') return row.difference === 0;
      return true;
    });
  }, [allRows, filter]);

  const handleCopyReport = async () => {
    const zoneLabel = locationFilter === 'all' ? 'Todas las ubicaciones' : locationFilter;
    const header = [
      `REPORTE DE CONTEO / AUDITORÍA (Solo contraste)`,
      `Ubicación: ${zoneLabel}`,
      `Fecha: ${new Date().toLocaleString('es-ES')}`,
      `Resumen: ${summary.exactCount} cuadran | ${summary.missingProducts} con faltante (-${summary.missingUnits} uds) | ${summary.surplusProducts} con sobrante (+${summary.surplusUnits} uds)`,
      `----------------------------------------`,
    ];

    const lines = allRows.map((row) => {
      const status =
        row.difference < 0
          ? `FALTAN ${Math.abs(row.difference)}`
          : row.difference > 0
            ? `SOBRAN ${row.difference}`
            : 'CUADRA';
      return `${row.product.name} [${row.product.location}] | Esperado: ${row.expected} | Contado: ${row.counted} | ${status}`;
    });

    try {
      await navigator.clipboard.writeText([...header, ...lines].join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignorar si el navegador bloquea clipboard
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
            Reporte de Discrepancias
          </h1>
          <p className="text-xs text-zinc-500">
            Zona auditada:{' '}
            <span className="font-medium text-zinc-800">
              {locationFilter === 'all' ? 'Todas las ubicaciones' : locationFilter}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToEdit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al conteo
          </button>

          <button
            type="button"
            onClick={() => void handleCopyReport()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar reporte'}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nuevo conteo
          </button>
        </div>
      </div>

      {/* Garantía explícita de solo contraste */}
      <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-3 text-xs text-zinc-700">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" />
        <p>
          <strong>Modo solo contraste:</strong> este reporte es únicamente informativo. No se ha
          añadido, eliminado ni modificado ningún valor del stock real en el inventario.
        </p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Cuadran</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-950">
            {summary.exactCount}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">de {summary.total} evaluados</p>
        </div>

        <div className="rounded-xl border border-red-200/80 bg-red-50/40 p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-red-700">Faltan</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-red-700">
            {summary.missingProducts}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-red-700/80">
            -{summary.missingUnits} uds en total
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-800">Sobran</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
            {summary.surplusProducts}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-emerald-700/80">
            +{summary.surplusUnits} uds en total
          </p>
        </div>
      </div>

      {/* Controles de filtrado y opción de no contados */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: `Todos (${summary.total})` },
              { id: 'discrepancies', label: `Discrepancias (${summary.discrepanciesCount})` },
              { id: 'missing', label: `Faltan (${summary.missingProducts})` },
              { id: 'surplus', label: `Sobran (${summary.surplusProducts})` },
              { id: 'exact', label: `Cuadran (${summary.exactCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                filter === tab.id
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={includeUncountedAsZero}
            onChange={(e) => setIncludeUncountedAsZero(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-950"
          />
          Incluir no contados como 0
        </label>
      </div>

      {/* Tabla de discrepancias */}
      {visibleRows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-zinc-900">Sin productos en este filtro</p>
          <p className="mt-1 text-xs text-zinc-500">
            Cambia el filtro superior o vuelve al conteo para añadir más lecturas.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  <th className="py-2.5 pr-3 pl-4">Producto</th>
                  <th className="px-3 py-2.5 text-right">Esperado</th>
                  <th className="px-3 py-2.5 text-right">Contado</th>
                  <th className="py-2.5 pr-4 pl-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const isMissing = row.difference < 0;
                  const isSurplus = row.difference > 0;

                  return (
                    <tr
                      key={row.product.id}
                      className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/60"
                    >
                      <td className="py-3 pr-3 pl-4">
                        <p className="text-sm font-medium text-zinc-950">{row.product.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                          <span className="font-mono">{row.product.barcode}</span>
                          <span className="inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-600">
                            <MapPin className="h-2.5 w-2.5 text-zinc-400" />
                            {row.product.location}
                          </span>
                          {!row.wasCounted && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              No escaneado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right text-sm tabular-nums text-zinc-600">
                        {row.expected}
                      </td>

                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-zinc-950">
                        {row.counted}
                      </td>

                      <td className="py-3 pr-4 pl-3 text-right">
                        {isMissing ? (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-red-700">
                            Faltan {Math.abs(row.difference)} ({row.difference})
                          </span>
                        ) : isSurplus ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-700">
                            Sobran {row.difference} (+{row.difference})
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                            Cuadra (0)
                          </span>
                        )}
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
