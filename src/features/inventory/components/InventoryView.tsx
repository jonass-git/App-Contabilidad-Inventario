import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Barcode, MapPin, Plus, Search, TriangleAlert } from 'lucide-react';
import { PRODUCT_LOCATIONS, type ProductLocation } from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';
import { triggerScanFeedback } from '../../../utils/feedback';
import { InventoryTable } from './InventoryTable';

interface InventoryViewProps {
  products: ProductWithBarcodes[];
  loading: boolean;
  error: string | null;
  onUpdateStock: (product: ProductWithBarcodes, newStock: number) => Promise<void>;
  onEditProduct: (product: ProductWithBarcodes) => void;
  onRequestNewProduct: (barcode?: string, location?: ProductLocation) => void;
}

export function InventoryView({
  products,
  loading,
  error,
  onUpdateStock,
  onEditProduct,
  onRequestNewProduct,
}: InventoryViewProps) {
  const [query, setQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | 'all'>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [usbIncrementMode, setUsbIncrementMode] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [scannerToast, setScannerToast] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const locationScopedProducts = useMemo(() => {
    if (selectedLocation === 'all') return products;
    return products.filter((p) => p.location === selectedLocation);
  }, [products, selectedLocation]);

  const lowStockCount = useMemo(
    () => locationScopedProducts.filter((p) => p.stock_current <= p.stock_min).length,
    [locationScopedProducts],
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locationScopedProducts.filter((product) => {
      if (onlyLowStock && product.stock_current > product.stock_min) {
        return false;
      }
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        product.barcodes.some((code) => code.toLowerCase().includes(q)) ||
        product.location.toLowerCase().includes(q) ||
        (product.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [locationScopedProducts, query, onlyLowStock]);

  const showToast = (message: string) => {
    setScannerToast(message);
    window.setTimeout(() => {
      setScannerToast((curr) => (curr === message ? null : curr));
    }, 2400);
  };

  /**
   * Compatibilidad con lectores de códigos de barras físicos USB / Bluetooth:
   * busca coincidencia exacta en cualquiera de los códigos/sabores vinculados.
   */
  const handleSearchKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const code = query.trim();
    if (!code) return;

    e.preventDefault();
    const exactMatch = products.find(
      (p) => p.barcode === code || p.barcodes.includes(code),
    );

    if (exactMatch) {
      setHighlightedId(exactMatch.id);
      if (selectedLocation !== 'all' && exactMatch.location !== selectedLocation) {
        setSelectedLocation('all');
      }
      if (usbIncrementMode) {
        triggerScanFeedback('success');
        const nextStock = exactMatch.stock_current + 1;
        await onUpdateStock(exactMatch, nextStock);
        showToast(`+1 en "${exactMatch.name}" (Stock: ${nextStock})`);
        setQuery('');
        searchInputRef.current?.focus();
      } else {
        showToast(`Producto localizado: ${exactMatch.name} (${exactMatch.location})`);
      }
      window.setTimeout(() => {
        setHighlightedId((curr) => (curr === exactMatch.id ? null : curr));
      }, 2200);
    } else if (/^[0-9A-Za-z-]{4,}$/.test(code)) {
      triggerScanFeedback('new');
      onRequestNewProduct(
        code,
        selectedLocation === 'all' ? undefined : selectedLocation,
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950">Inventario</h1>
          <p className="text-xs text-zinc-500">
            {locationScopedProducts.length}{' '}
            {locationScopedProducts.length === 1 ? 'producto' : 'productos'}
            {selectedLocation !== 'all' ? ` en ${selectedLocation}` : ''}
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-medium text-amber-700">
                <TriangleAlert className="h-3 w-3" />
                {lowStockCount} en alerta de stock
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onRequestNewProduct(
              undefined,
              selectedLocation === 'all' ? undefined : selectedLocation,
            )
          }
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 md:hidden"
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {/* Filtro rápido de ubicaciones */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-zinc-500">
          <MapPin className="h-3.5 w-3.5" />
          Ubicación:
        </span>
        <button
          type="button"
          onClick={() => setSelectedLocation('all')}
          className={`h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            selectedLocation === 'all'
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
              onClick={() => setSelectedLocation(loc)}
              className={`h-8 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                selectedLocation === loc
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
              }`}
            >
              {loc} ({count})
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda + controles */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => void handleSearchKeyDown(e)}
            placeholder="Buscar por nombre, código o escanear con lector USB (Enter)..."
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pr-3 pl-9 text-sm text-zinc-950 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyLowStock((prev) => !prev)}
            className={`h-10 rounded-lg border px-3 text-xs font-medium transition-colors ${
              onlyLowStock
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            Stock bajo ({lowStockCount})
          </button>

          <button
            type="button"
            onClick={() => setUsbIncrementMode((prev) => !prev)}
            title="Al escanear con lector USB/Bluetooth y pulsar Enter, suma +1 automáticamente"
            className={`hidden h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors sm:inline-flex ${
              usbIncrementMode
                ? 'border-zinc-950 bg-zinc-950 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <Barcode className="h-3.5 w-3.5" />
            Lector +1 {usbIncrementMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {scannerToast && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800">
          {scannerToast}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          Error cargando inventario: {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
          Cargando inventario...
        </div>
      ) : (
        <InventoryTable
          products={filteredProducts}
          highlightedId={highlightedId}
          onUpdateStock={onUpdateStock}
          onEditProduct={onEditProduct}
        />
      )}
    </div>
  );
}
