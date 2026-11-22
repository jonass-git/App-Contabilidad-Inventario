import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, MapPin, Trash2, X } from 'lucide-react';
import {
  PRODUCT_LOCATIONS,
  type ProductLocation,
} from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';
import type { UpdateProductInput } from '../hooks/useProducts';

interface EditProductModalProps {
  product: ProductWithBarcodes | null;
  onClose: () => void;
  onSave: (product: ProductWithBarcodes, updates: UpdateProductInput) => Promise<void>;
  onDelete: (product: ProductWithBarcodes) => Promise<void>;
}

export function EditProductModal({
  product,
  onClose,
  onSave,
  onDelete,
}: EditProductModalProps) {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<ProductLocation>('Tienda');
  const [stockCurrent, setStockCurrent] = useState('0');
  const [stockMin, setStockMin] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setBarcode(product.barcode);
      setName(product.name);
      setCategory(product.category ?? '');
      setLocation(product.location);
      setStockCurrent(String(product.stock_current));
      setStockMin(String(product.stock_min));
      setConfirmingDelete(false);
      setDeleting(false);
      setSubmitting(false);
      setError(null);
    }
  }, [product]);

  if (!product) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !name.trim()) {
      setError('El código de barras y el nombre son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(product, {
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim() || null,
        location,
        stock_current: Math.max(0, parseInt(stockCurrent, 10) || 0),
        stock_min: Math.max(0, parseInt(stockMin, 10) || 0),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(product);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-3 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-title"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="edit-product-title" className="text-base font-semibold text-zinc-950">
              Editar producto
            </h2>
            <p className="text-xs text-zinc-500">
              Modifica ubicación, datos básicos o elimina el producto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700" htmlFor="edit-name">
              Nombre del producto
            </label>
            <input
              id="edit-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-900"
            />
          </div>

          {/* Selector de ubicación */}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-zinc-700"
                htmlFor="edit-barcode"
              >
                Código principal
              </label>
              <input
                id="edit-barcode"
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-900"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-zinc-700"
                htmlFor="edit-category"
              >
                Categoría <span className="text-zinc-400">(opcional)</span>
              </label>
              <input
                id="edit-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Proteínas..."
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-zinc-700"
                htmlFor="edit-stock"
              >
                Stock actual
              </label>
              <input
                id="edit-stock"
                type="number"
                min={0}
                inputMode="numeric"
                value={stockCurrent}
                onChange={(e) => setStockCurrent(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm tabular-nums text-zinc-950 outline-none transition-colors focus:border-zinc-900"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-zinc-700"
                htmlFor="edit-min"
              >
                Stock mínimo
              </label>
              <input
                id="edit-min"
                type="number"
                min={0}
                inputMode="numeric"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm tabular-nums text-zinc-950 outline-none transition-colors focus:border-zinc-900"
              />
            </div>
          </div>

          {product.barcodes.length > 1 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                Códigos / sabores vinculados ({product.barcodes.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {product.barcodes.map((code) => (
                  <span
                    key={code}
                    className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || deleting}
              className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        {/* Zona de peligro: eliminación definitiva con confirmación previa */}
        <div className="mt-5 border-t border-zinc-200 pt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar producto definitivamente
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="text-xs text-red-900">
                  <p className="font-semibold">¿Eliminar "{product.name}"?</p>
                  <p className="mt-0.5 text-red-800/90">
                    Se borrará completamente del inventario junto con sus códigos vinculados y su
                    historial. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                  className="h-9 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  No, cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleConfirmDelete()}
                  className="h-9 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
