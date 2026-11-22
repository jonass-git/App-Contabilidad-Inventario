import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import type { Product } from '../../../types/database';

interface InventoryTableProps {
  products: Product[];
  highlightedId: string | null;
  onUpdateStock: (product: Product, newStock: number) => Promise<void>;
}

interface StockRowProps {
  product: Product;
  highlighted: boolean;
  onUpdateStock: (product: Product, newStock: number) => Promise<void>;
}

function StockRow({ product, highlighted, onUpdateStock }: StockRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftStock, setDraftStock] = useState(String(product.stock_current));
  const [saving, setSaving] = useState(false);

  const isOutOfStock = product.stock_current === 0;
  const isLowStock = product.stock_current <= product.stock_min;

  const commitStock = async (targetStock: number) => {
    const sanitized = Math.max(0, Math.floor(targetStock));
    if (sanitized === product.stock_current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdateStock(product, sanitized);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr
      className={`border-b border-zinc-100 transition-colors last:border-b-0 ${
        highlighted ? 'bg-zinc-100/90' : 'hover:bg-zinc-50/70'
      }`}
    >
      <td className="py-3 pr-3 pl-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isOutOfStock
                ? 'bg-red-500'
                : isLowStock
                  ? 'bg-amber-500'
                  : 'bg-emerald-500/70'
            }`}
            title={
              isOutOfStock
                ? 'Sin stock'
                : isLowStock
                  ? `Stock bajo (mín. ${product.stock_min})`
                  : 'Stock correcto'
            }
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950">{product.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono">{product.barcode}</span>
              {product.category && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                  {product.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="hidden px-3 py-3 text-xs text-zinc-500 sm:table-cell">
        {product.category ?? '—'}
      </td>

      <td className="hidden px-3 py-3 text-right text-xs tabular-nums text-zinc-500 md:table-cell">
        {product.stock_min}
      </td>

      <td className="py-3 pr-4 pl-3 text-right">
        <div className="inline-flex items-center justify-end gap-1.5">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void commitStock(parseInt(draftStock, 10) || 0);
              }}
              className="inline-flex items-center gap-1"
            >
              <input
                type="number"
                min={0}
                inputMode="numeric"
                autoFocus
                value={draftStock}
                onChange={(e) => setDraftStock(e.target.value)}
                onBlur={() => {
                  if (!saving) setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditing(false);
                    setDraftStock(String(product.stock_current));
                  }
                }}
                className="h-8 w-16 rounded-md border border-zinc-900 bg-white px-2 text-right text-sm font-semibold tabular-nums text-zinc-950 outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                onMouseDown={(e) => e.preventDefault()}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50"
                aria-label="Guardar stock"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                disabled={saving || product.stock_current <= 0}
                onClick={() => void commitStock(product.stock_current - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-35"
                aria-label={`Restar 1 a ${product.name}`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setDraftStock(String(product.stock_current));
                  setEditing(true);
                }}
                className={`min-w-[3rem] rounded-md px-2 py-1 text-center text-sm font-semibold tabular-nums transition-colors ${
                  isOutOfStock
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : isLowStock
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'text-zinc-950 hover:bg-zinc-100'
                }`}
                title="Haz clic para editar el stock manualmente"
              >
                {product.stock_current}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void commitStock(product.stock_current + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-35"
                aria-label={`Sumar 1 a ${product.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function InventoryTable({
  products,
  highlightedId,
  onUpdateStock,
}: InventoryTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-zinc-900">Sin productos que mostrar</p>
        <p className="mt-1 text-xs text-zinc-500">
          Prueba con otra búsqueda o añade tu primer artículo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              <th className="py-2.5 pr-3 pl-4">Producto / Código</th>
              <th className="hidden px-3 py-2.5 sm:table-cell">Categoría</th>
              <th className="hidden px-3 py-2.5 text-right md:table-cell">Mínimo</th>
              <th className="py-2.5 pr-4 pl-3 text-right">Stock actual</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <StockRow
                key={product.id}
                product={product}
                highlighted={product.id === highlightedId}
                onUpdateStock={onUpdateStock}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
