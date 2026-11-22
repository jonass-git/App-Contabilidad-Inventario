import { Check, Delete, Layers, MapPin, Minus, Plus, Trash2, X } from 'lucide-react';
import { PRODUCT_LOCATIONS, type ProductLocation } from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';

export type CountMode = 'increment' | 'manual';

export type DraftSession =
  | {
      kind: 'existing';
      product: ProductWithBarcodes;
      targetLocation: ProductLocation;
      countedStock: number;
      scannedCounts: Record<string, number>;
      pendingNewBarcodes: string[];
    }
  | {
      kind: 'new';
      name: string;
      category: string | null;
      location: ProductLocation;
      stockMin: number;
      countedStock: number;
      scannedCounts: Record<string, number>;
      pendingNewBarcodes: string[];
    };

interface ScannedProductCardProps {
  session: DraftSession;
  mode: CountMode;
  groupNewBarcodes: boolean;
  saving: boolean;
  onModeChange: (mode: CountMode) => void;
  onGroupNewBarcodesChange: (enabled: boolean) => void;
  onLocationChange: (location: ProductLocation) => void;
  onCountChange: (value: number) => void;
  onRemovePendingBarcode: (barcode: string) => void;
  onApply: () => Promise<void>;
  onCancel: () => void;
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function ScannedProductCard({
  session,
  mode,
  groupNewBarcodes,
  saving,
  onModeChange,
  onGroupNewBarcodesChange,
  onLocationChange,
  onCountChange,
  onRemovePendingBarcode,
  onApply,
  onCancel,
}: ScannedProductCardProps) {
  const isNewProduct = session.kind === 'new';
  const title = isNewProduct ? session.name : session.product.name;
  const activeLocation = isNewProduct ? session.location : session.targetLocation;
  const locationChanged = !isNewProduct && session.targetLocation !== session.product.location;
  const theoreticalStock = isNewProduct ? 0 : session.product.stock_current;
  const diff = session.countedStock - theoreticalStock;
  const scannedCodes = Object.entries(session.scannedCounts);
  const newCodesSet = new Set(session.pendingNewBarcodes);

  const appendDigit = (digit: string) => {
    const next = parseInt(`${session.countedStock}${digit}`, 10);
    if (!Number.isNaN(next) && next <= 999999) {
      onCountChange(next);
    }
  };

  const handleBackspace = () => {
    const next = Math.floor(session.countedStock / 10);
    onCountChange(next);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      {/* Cabecera del producto / borrador */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              {isNewProduct ? 'Producto nuevo · Sin guardar' : 'Recuento en borrador · Sin guardar'}
            </span>
            {session.pendingNewBarcodes.length > 0 && (
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                +{session.pendingNewBarcodes.length}{' '}
                {session.pendingNewBarcodes.length === 1 ? 'código nuevo' : 'códigos nuevos'}
              </span>
            )}
          </div>

          <h2 className="truncate text-base font-semibold text-zinc-950">{title}</h2>

          <p className="mt-0.5 text-xs text-zinc-500">
            {isNewProduct ? (
              <>
                Se creará al pulsar <strong>Aceptar</strong>
                {session.category ? ` · ${session.category}` : ''}
              </>
            ) : (
              <>
                Stock teórico:{' '}
                <span className="font-semibold tabular-nums text-zinc-900">
                  {session.product.stock_current}
                </span>
                {' · '}
                {session.product.barcodes.length}{' '}
                {session.product.barcodes.length === 1 ? 'código' : 'códigos'}
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Descartar sin guardar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Selector de ubicación del producto en esta sesión */}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600">
            <MapPin className="h-3 w-3 text-zinc-400" />
            Ubicación asignada
          </span>
          {locationChanged && (
            <span className="text-[11px] font-medium text-amber-700">
              Cambia de {session.product.location} → {session.targetLocation}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PRODUCT_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => onLocationChange(loc)}
              className={`min-h-[36px] rounded-md border px-1.5 text-[11px] font-medium transition-colors ${
                activeLocation === loc
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle de agrupación de sabores / códigos nuevos */}
      <button
        type="button"
        onClick={() => onGroupNewBarcodesChange(!groupNewBarcodes)}
        className={`mt-3 flex min-h-[48px] w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
          groupNewBarcodes
            ? 'border-zinc-900 bg-zinc-950 text-white'
            : 'border-zinc-200 bg-zinc-50 text-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2.5 pr-2">
          <Layers className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Agrupar otros sabores (códigos nuevos)</p>
            <p
              className={`text-[11px] ${groupNewBarcodes ? 'text-zinc-300' : 'text-zinc-500'}`}
            >
              {groupNewBarcodes
                ? 'Activo: cualquier código nuevo escaneado suma +1 a este producto'
                : 'Desactivado: solo cuenta códigos ya vinculados'}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            groupNewBarcodes ? 'bg-white text-zinc-950' : 'bg-zinc-200 text-zinc-700'
          }`}
        >
          {groupNewBarcodes ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Selector de modo: +1 automático vs Manual */}
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-100 p-1">
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
      <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Total en recuento
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-zinc-950">
            {session.countedStock}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {isNewProduct ? 'Stock inicial' : 'Descuadre'}
          </p>
          <p
            className={`mt-0.5 text-lg font-semibold tabular-nums ${
              isNewProduct
                ? 'text-zinc-900'
                : diff < 0
                  ? 'text-red-600'
                  : diff > 0
                    ? 'text-emerald-600'
                    : 'text-zinc-500'
            }`}
          >
            {isNewProduct ? `+${session.countedStock}` : diff > 0 ? `+${diff}` : diff}
          </p>
        </div>
      </div>

      {/* Controles según modo */}
      {mode === 'increment' ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={session.countedStock <= 0}
              onClick={() => onCountChange(Math.max(0, session.countedStock - 1))}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-base font-semibold text-zinc-900 active:bg-zinc-100 disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />1
            </button>
            <button
              type="button"
              onClick={() => onCountChange(session.countedStock + 1)}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg border border-zinc-950 bg-zinc-950 text-base font-semibold text-white active:bg-zinc-800"
            >
              <Plus className="h-5 w-5" />1
            </button>
          </div>
          <p className="text-center text-xs text-zinc-500">
            Sigue pasando todos los botes/sabores. Nada se guardará hasta pulsar Aceptar.
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

      {/* Códigos escaneados en esta sesión */}
      {scannedCodes.length > 0 && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
            Códigos leídos en este recuento ({scannedCodes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {scannedCodes.map(([code, qty]) => {
              const isPendingNew = newCodesSet.has(code);
              const canRemove =
                isPendingNew && !(isNewProduct && session.pendingNewBarcodes.length <= 1);
              return (
                <span
                  key={code}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] ${
                    isPendingNew
                      ? 'border-zinc-300 bg-white text-zinc-900'
                      : 'border-zinc-200 bg-zinc-100/80 text-zinc-600'
                  }`}
                >
                  <span>{code}</span>
                  <span className="font-sans font-semibold text-zinc-500">×{qty}</span>
                  {isPendingNew && (
                    <span className="rounded bg-zinc-900 px-1 py-0.2 font-sans text-[9px] font-medium text-white">
                      nuevo
                    </span>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => onRemovePendingBarcode(code)}
                      className="ml-0.5 text-zinc-400 hover:text-red-600"
                      title="Quitar este código del borrador"
                      aria-label={`Quitar código ${code}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Acciones finales: Aceptar o Descartar */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void onApply()}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:bg-zinc-900 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {saving ? 'Guardando en inventario...' : 'Aceptar y guardar en inventario'}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Descartar sin guardar
        </button>
      </div>
    </div>
  );
}
