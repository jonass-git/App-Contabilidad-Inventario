import { CameraOff, Flashlight, FlashlightOff, RefreshCw } from 'lucide-react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface ScannerCameraProps {
  active: boolean;
  onScan: (barcode: string) => void;
}

const SCANNER_REGION_ID = 'barcode-scanner-region';

export function ScannerCamera({ active, onScan }: ScannerCameraProps) {
  const { isRunning, error, torchSupported, torchEnabled, toggleTorch, restart } =
    useBarcodeScanner({
      elementId: SCANNER_REGION_ID,
      enabled: active,
      onScan,
    });

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
      <div id={SCANNER_REGION_ID} className="min-h-[220px] w-full sm:min-h-[260px]" />

      {/* Controles superpuestos minimalistas */}
      {isRunning && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Escáner activo
          </span>

          {torchSupported && (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                torchEnabled
                  ? 'border-amber-300 bg-amber-400 text-zinc-950'
                  : 'border-white/20 bg-zinc-950/70 text-white hover:bg-zinc-900'
              }`}
              aria-label={torchEnabled ? 'Apagar linterna' : 'Encender linterna'}
            >
              {torchEnabled ? (
                <Flashlight className="h-5 w-5" />
              ) : (
                <FlashlightOff className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Estado de error / permiso */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-5 text-center text-white">
          <CameraOff className="mb-2.5 h-7 w-7 text-zinc-400" />
          <p className="max-w-xs text-sm font-medium text-zinc-100">{error}</p>
          <button
            type="button"
            onClick={() => void restart()}
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar cámara
          </button>
        </div>
      )}
    </div>
  );
}
