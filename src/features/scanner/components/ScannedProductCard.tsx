import { Check, Delete, Minus, Plus, X } from 'lucide-react';
import type { Product } from '../../../types/database';

export type CountMode = 'increment' | 'manual';

interface ScannedProductCardProps {
  product: Product;
  countedStock: number;
  mode: CountMode;
  saving: boolean;
  onModeChange: (mode: CountMode) => void;
  onCountChange: (value: number) => void;
  onApply: () => Promise<void>;
  onCancel: () => void;
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function ScannedProductCard({
  product,
  countedStock,
  mode,
  saving,
  onModeChange,
  onCountChange,
  onApply,
  onCancel,
}: ScannedProductCardProps) {
  const diff = countedStock - product.stock_current;

  const appendDigit = (digit: string) => {
    const next = parseInt(`${countedStock}${digit}`, 10);
    if (!Number.isNaN(next) && next <= 999999) {
      onCountChange(next);
    }
  };

  const handleBackspace = () => {
    const next = Math.floor(countedStock / 10);
    onCountChange(next);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      {/* Cabecera del producto */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-500">{product.barcode}</p>
          <h2 className="truncate text-base font-semibold text-zinc-950">{product.name}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Stock teórico:{' '}
            <span className="font-semibold tabular-nums text-zinc-900">
              {product.stock_current}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Descartar producto actual"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Selector de modo: +1 automático vs Manual */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => onModeChange('increment')}
          className={`min-h-[44px] rounded-md text-xs font-medium transition-colors ${
            mode === 'increment'
              ? 'bg-white text-zinc-950 ring-1 ring-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          Modo +1 automático
        </button>
        <button
          type="button"
          onClick={() => onModeChange('manual')}
          className={`min-h-[44px] rounded-md text-xs font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-white text-zinc-950 ring-1 ring-zinc-200'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          Cantidad manual
        </button>
      </div>

      {/* Indicador de cantidad contada y diferencia */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Recuento actual
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-zinc-950">
            {countedStock}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Descuadre
          </p>
          <p
            className={`mt-0.5 text-lg font-semibold tabular-nums ${
              diff < 0
                ? 'text-red-600'
                : diff > 0
                  ? 'text-emerald-600'
                  : 'text-zinc-500'
            }`}
          >
            {diff > 0 ? `+${diff}` : diff}
          </p>
        </div>
      </div>

      {/* Controles según modo */}
      {mode === 'increment' ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={countedStock <= 0}
              onClick={() => onCountChange(Math.max(0, countedStock - 1))}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-base font-semibold text-zinc-900 active:bg-zinc-100 disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />1
            </button>
            <button
              type="button"
              onClick={() => onCountChange(countedStock + 1)}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-zinc-950 bg-zinc-950 text-base font-semibold text-white active:bg-zinc-800"
            >
              <Plus className="h-5 w-5" />1
            </button>
          </div>
          <p className="text-center text-xs text-zinc-500">
            Escanea de nuevo el mismo código para sumar +1 automáticamente.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYPAD_DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => appendDigit(digit)}
              className="flex min-h-[52px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-semibold tabular-nums text-zinc-950 active:bg-zinc-100"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onCountChange(0)}
            className="flex min-h-[52px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-600 active:bg-zinc-100"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => appendDigit('0')}
            className="flex min-h-[52px] items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-semibold tabular-nums text-zinc-950 active:bg-zinc-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="flex min-h-[52px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 active:bg-zinc-100"
            aria-label="Borrar dígito"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Botón principal de confirmación */}
      <button
        type="button"
        disabled={saving}
        onClick={() => void onApply()}
        className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:bg-zinc-900 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {saving ? 'Aplicando recuento...' : 'Finalizar y aplicar recuento'}
      </button>
    </div>
  );
}
