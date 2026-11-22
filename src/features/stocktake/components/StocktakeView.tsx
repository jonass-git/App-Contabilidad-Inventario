import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PRODUCT_LOCATIONS, type ProductLocation } from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';
import { triggerScanFeedback } from '../../../utils/feedback';
import { ScannerCamera } from '../../scanner/components/ScannerCamera';
import { StocktakeReport } from './StocktakeReport';

/**
 * Pantalla de Modo Conteo / Auditoría de Stock (SOLO CONTRASTE).
 * Por diseño no recibe ni invoca ninguna mutación sobre la base de datos:
 * no crea, no edita ni elimina productos ni modifica stock_current.
 */
interface StocktakeViewProps {
  products: ProductWithBarcodes[];
  findByBarcode: (barcode: string) => ProductWithBarcodes | undefined;
}

export function StocktakeView({ products, findByBarcode }: StocktakeViewProps) {
  const [locationFilter, setLocationFilter] = useState<ProductLocation | 'all'>('all');
  const [query, setQuery] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [countedMap, setCountedMap] = useState<Record<string, number>>({});
  const [showReport, setShowReport] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((kind: 'ok' | 'warn', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => {
      setToast((curr) => (curr?.text === text ? null : curr));
    }, 3000);
  }, []);

  const scopedProducts = useMemo(() => {
    if (locationFilter === 'all') return products;
    return products.filter((p) => p.location === locationFilter);
  }, [products, locationFilter]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopedProducts;
    return scopedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.barcodes.some((code) => code.toLowerCase().includes(q)) ||
        (p.category?.toLowerCase().includes(q) ?? false),
    );
  }, [scopedProducts, query]);

  const countedProductsCount = useMemo(
    () =>
      scopedProducts.filter((p) => Object.prototype.hasOwnProperty.call(countedMap, p.id))
        .length,
    [scopedProducts, countedMap],
  );

  const totalUnitsCounted = useMemo(
    () =>
      scopedProducts.reduce(
        (acc, p) =>
          acc + (Object.prototype.hasOwnProperty.call(countedMap, p.id) ? countedMap[p.id] : 0),
        0,
      ),
    [scopedProducts, countedMap],
  );

  const incrementProductCount = useCallback(
    (product: ProductWithBarcodes, delta = 1) => {
      setCountedMap((prev) => {
        const current = prev[product.id] ?? 0;
        const next = Math.max(0, current + delta);
        return { ...prev, [product.id]: next };
      });
      setLastScannedId(product.id);
      window.setTimeout(() => {
        setLastScannedId((curr) => (curr === product.id ? null : curr));
      }, 1800);
    },
    [],
  );

  const setExactProductCount = (productId: string, rawValue: string) => {
    if (rawValue === '') {
      setCountedMap((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    const parsed = Math.max(0, parseInt(rawValue, 10) || 0);
    setCountedMap((prev) => ({ ...prev, [productId]: parsed }));
  };

  const handleBarcodeRead = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      const found = findByBarcode(code);
      if (!found) {
        triggerScanFeedback('new');
        showToast(
          'warn',
          `Código ${code} no registrado. En Modo Conteo no se añaden productos nuevos.`,
        );
        return;
      }

      if (locationFilter !== 'all' && found.location !== locationFilter) {
        triggerScanFeedback('new');
        showToast(
          'warn',
          `"${found.name}" pertenece a ${found.location} (estás auditando ${locationFilter}).`,
        );
        return;
      }

      triggerScanFeedback('success');
      incrementProductCount(found, 1);
      const nextPreview = (countedMap[found.id] ?? 0) + 1;
      showToast('ok', `+1 contado en "${found.name}" (Total contado: ${nextPreview})`);
    },
    [countedMap, findByBarcode, incrementProductCount, locationFilter, showToast],
  );

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const code = query.trim();
    if (!code) return;

    const exact = findByBarcode(code);
    if (exact) {
      e.preventDefault();
      handleBarcodeRead(code);
      setQuery('');
      searchInputRef.current?.focus();
    }
  };

  const handleReset = () => {
    setCountedMap({});
    setShowReport(false);
    setToast(null);
  };

  if (showReport) {
    return (
      <StocktakeReport
        products={scopedProducts}
        countedMap={countedMap}
        locationFilter={locationFilter}
        onBackToEdit={() => setShowReport(false)}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
              Modo Conteo / Auditoría
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
              <ShieldCheck className="h-3 w-3" />
              Solo contraste
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Contabiliza físicamente para detectar faltantes o sobrantes sin modificar el stock real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCameraOpen((prev) => !prev)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              cameraOpen
                ? 'border-zinc-950 bg-zinc-950 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            {cameraOpen ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {cameraOpen ? 'Ocultar cámara' : 'Escanear con cámara'}
          </button>

          {Object.keys(countedMap).length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              title="Reiniciar cantidades contadas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Selector de ubicación a auditar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
          <MapPin className="h-3.5 w-3.5" />
          Zona:
        </span>
        <button
          type="button"
          onClick={() => setLocationFilter('all')}
          className={`h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            locationFilter === 'all'
              ? 'border-zinc-950 bg-zinc-950 text-white'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
          }`}
        >
          Todas ({products.length})
        </button>
        {PRODUCT_LOCATIONS.map((loc) => {
          const count = products.filter((p) => p.location === loc).length;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => setLocationFilter(loc)}
              className={`h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                locationFilter === loc
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
              }`}
            >
              {loc} ({count})
            </button>
          );
        })}
      </div>

      {/* Visor de cámara opcional para ir escaneando durante la auditoría */}
      {cameraOpen && (
        <div className="mx-auto max-w-lg">
          <ScannerCamera active={cameraOpen} onScan={handleBarcodeRead} />
        </div>
      )}

      {/* Toast de feedback */}
      {toast && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-medium ${
            toast.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {toast.kind === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Buscador + barra de acción Aceptar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar producto o escanear con lector USB (Enter suma +1)..."
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pr-3 pl-9 text-sm text-zinc-950 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-900"
          />
        </div>

        <button
          type="button"
          disabled={scopedProducts.length === 0}
          onClick={() => {
            setCameraOpen(false);
            setShowReport(true);
          }}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Aceptar y ver reporte ({countedProductsCount}/{scopedProducts.length})
        </button>
      </div>

      {/* Resumen de progreso */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 py-2 text-xs text-zinc-600">
        <span>
          Productos contabilizados:{' '}
          <strong className="tabular-nums text-zinc-950">
            {countedProductsCount} / {scopedProducts.length}
          </strong>
        </span>
        <span>
          Unidades físicas contadas:{' '}
          <strong className="tabular-nums text-zinc-950">{totalUnitsCounted}</strong>
        </span>
      </div>

      {/* Lista de productos para conteo físico */}
      {visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-900">Sin productos en esta zona</p>
          <p className="mt-1 text-xs text-zinc-500">
            Selecciona otra ubicación o revisa el buscador.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  <th className="py-2.5 pr-3 pl-4">Producto</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Ubicación</th>
                  <th className="px-3 py-2.5 text-right">Teórico</th>
                  <th className="py-2.5 pr-4 pl-3 text-right">Contado físico</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const hasValue = Object.prototype.hasOwnProperty.call(countedMap, product.id);
                  const counted = hasValue ? countedMap[product.id] : 0;
                  const isHighlighted = lastScannedId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-zinc-100 transition-colors last:border-b-0 ${
                        isHighlighted
                          ? 'bg-emerald-50/70'
                          : hasValue
                            ? 'bg-zinc-50/40'
                            : 'hover:bg-zinc-50/60'
                      }`}
                    >
                      <td className="py-3 pr-3 pl-4">
                        <p className="text-sm font-medium text-zinc-950">{product.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">
                          {product.barcode}
                          {product.barcodes.length > 1
                            ? ` (+${product.barcodes.length - 1} sabores)`
                            : ''}
                        </p>
                      </td>

                      <td className="hidden px-3 py-3 text-xs text-zinc-600 sm:table-cell">
                        {product.location}
                      </td>

                      <td className="px-3 py-3 text-right text-sm tabular-nums text-zinc-500">
                        {product.stock_current}
                      </td>

                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={!hasValue || counted <= 0}
                            onClick={() => incrementProductCount(product, -1)}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-35"
                            aria-label={`Restar 1 a ${product.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            placeholder="—"
                            value={hasValue ? String(counted) : ''}
                            onChange={(e) => setExactProductCount(product.id, e.target.value)}
                            aria-label={`Cantidad contada de ${product.name}`}
                            className={`h-9 w-16 rounded-md border px-2 text-center text-sm font-semibold tabular-nums outline-none transition-colors ${
                              hasValue
                                ? 'border-zinc-900 bg-white text-zinc-950'
                                : 'border-zinc-200 bg-zinc-50/60 text-zinc-500 focus:border-zinc-900 focus:bg-white focus:text-zinc-950'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => incrementProductCount(product, 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label={`Sumar 1 a ${product.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón inferior grande para confirmar cómodamente en móvil */}
      <div className="pt-1 sm:hidden">
        <button
          type="button"
          disabled={scopedProducts.length === 0}
          onClick={() => {
            setCameraOpen(false);
            setShowReport(true);
          }}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white active:bg-zinc-800 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Aceptar y generar reporte
        </button>
      </div>
    </div>
  );
}
