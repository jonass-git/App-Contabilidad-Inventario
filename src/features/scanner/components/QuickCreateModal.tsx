import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { appConfig } from '../../../config/appConfig';
import type { ProductInsert } from '../../../types/database';

interface QuickCreateModalProps {
  barcode: string | null;
  onClose: () => void;
  onCreate: (input: ProductInsert) => Promise<void>;
}

export function QuickCreateModal({ barcode, onClose, onCreate }: QuickCreateModalProps) {
  const [name, setName] = useState('');
  const [stockCurrent, setStockCurrent] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (barcode) {
      setName('');
      setStockCurrent('1');
      setError(null);
    }
  }, [barcode]);

  if (!barcode) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Escribe el nombre del producto.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate({
        barcode,
        name: name.trim(),
        stock_current: Math.max(0, parseInt(stockCurrent, 10) || 0),
        stock_min: appConfig.DEFAULT_STOCK_MIN,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el producto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-3 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-create-title"
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="quick-create-title" className="text-base font-semibold text-zinc-950">
              Código no registrado
            </h2>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">{barcode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-name" className="mb-1.5 block text-xs font-medium text-zinc-700">
              Nombre del producto
            </label>
            <input
              id="quick-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Agua Mineral 1.5L"
              className="min-h-[48px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-base text-zinc-950 outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label htmlFor="quick-stock" className="mb-1.5 block text-xs font-medium text-zinc-700">
              Cantidad inicial
            </label>
            <input
              id="quick-stock"
              type="number"
              min={0}
              inputMode="numeric"
              value={stockCurrent}
              onChange={(e) => setStockCurrent(e.target.value)}
              className="min-h-[48px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-base font-semibold tabular-nums text-zinc-950 outline-none focus:border-zinc-900"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[48px] rounded-lg bg-zinc-950 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar ahora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
