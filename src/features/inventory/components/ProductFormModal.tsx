import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, X } from 'lucide-react';
import {
  appConfig,
  PRODUCT_LOCATIONS,
  type ProductLocation,
} from '../../../config/appConfig';
import type { ProductInsert } from '../../../types/database';

interface ProductFormModalProps {
  open: boolean;
  initialBarcode?: string;
  initialLocation?: ProductLocation;
  onClose: () => void;
  onSubmit: (data: ProductInsert) => Promise<void>;
}

export function ProductFormModal({
  open,
  initialBarcode = '',
  initialLocation = appConfig.DEFAULT_LOCATION,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<ProductLocation>(initialLocation);
  const [stockCurrent, setStockCurrent] = useState('0');
  const [stockMin, setStockMin] = useState(String(appConfig.DEFAULT_STOCK_MIN));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBarcode(initialBarcode);
      setName('');
      setCategory('');
      setLocation(initialLocation);
      setStockCurrent('0');
      setStockMin(String(appConfig.DEFAULT_STOCK_MIN));
      setError(null);
    }
  }, [open, initialBarcode, initialLocation]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !name.trim()) {
      setError('El código de barras y el nombre son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim() || null,
        location,
        stock_current: Math.max(0, parseInt(stockCurrent, 10) || 0),
        stock_min: Math.max(0, parseInt(stockMin, 10) || 0),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-product-title"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 id="new-product-title" className="text-base font-semibold text-zinc-950">
              Nuevo producto
            </h2>
            <p className="text-xs text-zinc-500">
              Registra un artículo con su código de barras, ubicación y stock inicial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700" htmlFor="prod-barcode">
              Código de barras
            </label>
            <input
              id="prod-barcode"
              type="text"
              required
              autoFocus={!initialBarcode}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ej. 8412345678901"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700" htmlFor="prod-name">
              Nombre del producto
            </label>
            <input
              id="prod-name"
              type="text"
              required
              autoFocus={Boolean(initialBarcode)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Proteína Whey Nova 1 kg"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-900"
            />
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              Ubicación
            </span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {PRODUCT_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`min-h-[40px] rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                    location === loc
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700" htmlFor="prod-category">
              Categoría <span className="text-zinc-400">(opcional)</span>
            </label>
            <input
              id="prod-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Bebidas, Suplementación..."
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700" htmlFor="prod-stock">
                Stock inicial
              </label>
              <input
                id="prod-stock"
                type="number"
                min={0}
                inputMode="numeric"
                value={stockCurrent}
                onChange={(e) => setStockCurrent(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm tabular-nums text-zinc-950 outline-none transition-colors focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700" htmlFor="prod-min">
                Stock mínimo
              </label>
              <input
                id="prod-min"
                type="number"
                min={0}
                inputMode="numeric"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm tabular-nums text-zinc-950 outline-none transition-colors focus:border-zinc-900"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
