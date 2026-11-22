import { useCallback, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Keyboard, MapPin } from 'lucide-react';
import { PRODUCT_LOCATIONS, type ProductLocation } from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';
import { triggerScanFeedback } from '../../../utils/feedback';
import type { CommitScannerSessionPayload } from '../../inventory/hooks/useProducts';
import { QuickCreateModal, type NewProductDraft } from './QuickCreateModal';
import {
  ScannedProductCard,
  type CountMode,
  type DraftSession,
} from './ScannedProductCard';
import { ScannerCamera } from './ScannerCamera';

interface ScannerViewProps {
  products: ProductWithBarcodes[];
  findByBarcode: (barcode: string) => ProductWithBarcodes | undefined;
  onCommitSession: (payload: CommitScannerSessionPayload) => Promise<ProductWithBarcodes>;
}

export function ScannerView({
  products,
  findByBarcode,
  onCommitSession,
}: ScannerViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | 'all'>('all');
  const [session, setSession] = useState<DraftSession | null>(null);
  const [mode, setMode] = useState<CountMode>('increment');
  const [groupNewBarcodes, setGroupNewBarcodes] = useState<boolean>(true);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showStatus = useCallback((msg: string) => {
    setWarningMessage(null);
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  const showWarning = useCallback((msg: string) => {
    setStatusMessage(null);
    setWarningMessage(msg);
    window.setTimeout(() => {
      setWarningMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  const handleBarcodeDetected = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || unknownBarcode) return;

      setErrorMessage(null);
      const found = findByBarcode(code);

      // 1. No hay sesión abierta todavía
      if (!session) {
        if (!found) {
          triggerScanFeedback('new');
          setUnknownBarcode(code);
          return;
        }

        triggerScanFeedback('success');
        const targetLocation: ProductLocation =
          selectedLocation === 'all' ? found.location : selectedLocation;

        setSession({
          kind: 'existing',
          product: found,
          targetLocation,
          countedStock: mode === 'increment' ? 1 : found.stock_current,
          scannedCounts: { [code]: 1 },
          pendingNewBarcodes: [],
        });

        if (selectedLocation !== 'all' && found.location !== selectedLocation) {
          showWarning(
            `"${found.name}" estaba en ${found.location}. Al aceptar se asignará a ${selectedLocation} (puedes cambiarlo en la tarjeta).`,
          );
        }
        return;
      }

      // 2. Ya hay una sesión abierta en borrador (NO se guarda hasta pulsar Aceptar)
      const belongsToCurrentExisting =
        session.kind === 'existing' && found?.id === session.product.id;
      const alreadyInDraftBarcodes = session.pendingNewBarcodes.includes(code);

      if (belongsToCurrentExisting || alreadyInDraftBarcodes) {
        triggerScanFeedback('success');
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            countedStock: mode === 'increment' ? prev.countedStock + 1 : prev.countedStock,
            scannedCounts: {
              ...prev.scannedCounts,
              [code]: (prev.scannedCounts[code] ?? 0) + 1,
            },
          };
        });
        return;
      }

      if (found) {
        triggerScanFeedback('new');
        showWarning(
          `El código ${code} pertenece a "${found.name}". Pulsa Aceptar o Descartar antes de cambiar de producto.`,
        );
        return;
      }

      if (groupNewBarcodes) {
        triggerScanFeedback('success');
        setSession((prev) => {
          if (!prev) return prev;
          const nextPending = prev.pendingNewBarcodes.includes(code)
            ? prev.pendingNewBarcodes
            : [...prev.pendingNewBarcodes, code];
          return {
            ...prev,
            countedStock: mode === 'increment' ? prev.countedStock + 1 : prev.countedStock,
            scannedCounts: {
              ...prev.scannedCounts,
              [code]: (prev.scannedCounts[code] ?? 0) + 1,
            },
            pendingNewBarcodes: nextPending,
          };
        });
        showStatus(`Nuevo código/sabor agrupado al borrador (${code}).`);
      } else {
        triggerScanFeedback('new');
        showWarning(
          `Código ${code} no vinculado. Activa "Agrupar otros sabores" para sumarlo a este producto.`,
        );
      }
    },
    [
      findByBarcode,
      groupNewBarcodes,
      mode,
      selectedLocation,
      session,
      showStatus,
      showWarning,
      unknownBarcode,
    ],
  );

  const handleManualLookup = (e: FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode);
    setManualCode('');
  };

  const handleStartNewDraft = (draft: NewProductDraft) => {
    setUnknownBarcode(null);
    setSession({
      kind: 'new',
      name: draft.name,
      category: draft.category,
      location: draft.location,
      stockMin: draft.stockMin,
      countedStock: 1,
      scannedCounts: { [draft.barcode]: 1 },
      pendingNewBarcodes: [draft.barcode],
    });
    showStatus(
      `Borrador iniciado para "${draft.name}" (${draft.location}). Sigue escaneando o pulsa Aceptar.`,
    );
  };

  const handleAttachToExisting = (product: ProductWithBarcodes, barcode: string) => {
    setUnknownBarcode(null);
    const targetLocation: ProductLocation =
      selectedLocation === 'all' ? product.location : selectedLocation;

    setSession({
      kind: 'existing',
      product,
      targetLocation,
      countedStock: mode === 'increment' ? 1 : product.stock_current,
      scannedCounts: { [barcode]: 1 },
      pendingNewBarcodes: [barcode],
    });
    showStatus(
      `Código ${barcode} listo para vincular a "${product.name}" al pulsar Aceptar.`,
    );
  };

  const handleRemovePendingBarcode = (barcode: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const removedQty = prev.scannedCounts[barcode] ?? 0;
      const nextScannedCounts = { ...prev.scannedCounts };
      delete nextScannedCounts[barcode];
      return {
        ...prev,
        countedStock: Math.max(0, prev.countedStock - removedQty),
        scannedCounts: nextScannedCounts,
        pendingNewBarcodes: prev.pendingNewBarcodes.filter((c) => c !== barcode),
      };
    });
  };

  const handleApplySession = async () => {
    if (!session) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const saved =
        session.kind === 'new'
          ? await onCommitSession({
              kind: 'new',
              name: session.name,
              category: session.category,
              location: session.location,
              stockMin: session.stockMin,
              countedStock: session.countedStock,
              barcodes: session.pendingNewBarcodes,
            })
          : await onCommitSession({
              kind: 'existing',
              product: session.product,
              countedStock: session.countedStock,
              newBarcodes: session.pendingNewBarcodes,
              location:
                session.targetLocation !== session.product.location
                  ? session.targetLocation
                  : undefined,
            });

      const extraInfo =
        session.pendingNewBarcodes.length > 0
          ? ` (+${session.pendingNewBarcodes.length} ${
              session.pendingNewBarcodes.length === 1 ? 'código guardado' : 'códigos guardados'
            })`
          : '';
      showStatus(
        `Guardado "${saved.name}" en ${saved.location} con ${saved.stock_current} uds${extraInfo}.`,
      );
      setSession(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo guardar el recuento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950">Escáner rápido</h1>
        <p className="text-xs text-zinc-500">
          Elige la ubicación de trabajo, escanea varios sabores y guarda solo al pulsar Aceptar.
        </p>
      </div>

      {/* Filtro / Selector de ubicación en pantalla de escaneo */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700">
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            Ubicación de escaneo
          </span>
          <span className="text-[11px] text-zinc-500">
            {selectedLocation === 'all'
              ? 'Sin filtro de zona'
              : `Asignando a ${selectedLocation}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedLocation('all')}
            className={`min-h-[38px] rounded-lg border px-3 text-xs font-medium transition-colors ${
              selectedLocation === 'all'
                ? 'border-zinc-950 bg-zinc-950 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
            }`}
          >
            Todas
          </button>
          {PRODUCT_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setSelectedLocation(loc)}
              className={`min-h-[38px] rounded-lg border px-3 text-xs font-medium transition-colors ${
                selectedLocation === loc
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Visor de cámara trasera */}
      <ScannerCamera active={!unknownBarcode} onScan={handleBarcodeDetected} />

      {/* Mensajes de estado, aviso y error */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {warningMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <span>{warningMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Tarjeta de sesión en borrador o estado en espera */}
      {session ? (
        <ScannedProductCard
          session={session}
          mode={mode}
          groupNewBarcodes={groupNewBarcodes}
          saving={saving}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            if (
              nextMode === 'manual' &&
              session.kind === 'existing' &&
              session.countedStock === 0
            ) {
              setSession((prev) =>
                prev && prev.kind === 'existing'
                  ? { ...prev, countedStock: prev.product.stock_current }
                  : prev,
              );
            }
          }}
          onGroupNewBarcodesChange={setGroupNewBarcodes}
          onLocationChange={(nextLocation) => {
            setSession((prev) => {
              if (!prev) return prev;
              if (prev.kind === 'new') {
                return { ...prev, location: nextLocation };
              }
              return { ...prev, targetLocation: nextLocation };
            });
          }}
          onCountChange={(val) =>
            setSession((prev) => (prev ? { ...prev, countedStock: val } : prev))
          }
          onRemovePendingBarcode={handleRemovePendingBarcode}
          onApply={handleApplySession}
          onCancel={() => {
            setSession(null);
            setWarningMessage(null);
            showStatus('Recuento descartado. No se modificó el inventario.');
          }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-5 text-center">
          <p className="text-sm font-medium text-zinc-800">Listo para escanear</p>
          <p className="mt-1 text-xs text-zinc-500">
            Escanea el primer producto para abrir el recuento en borrador. Podrás añadir varios
            sabores con códigos distintos y guardar todo al pulsar <strong>Aceptar</strong>.
          </p>
        </div>
      )}

      {/* Entrada manual de respaldo */}
      <form onSubmit={handleManualLookup} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            inputMode="numeric"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Introducir código manualmente..."
            className="min-h-[48px] w-full rounded-lg border border-zinc-200 bg-white pr-3 pl-9 font-mono text-sm text-zinc-950 placeholder:font-sans placeholder:text-zinc-400 outline-none focus:border-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="min-h-[48px] shrink-0 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          Añadir
        </button>
      </form>

      {/* Modal rápido para códigos no registrados (sin sesión activa) */}
      <QuickCreateModal
        barcode={unknownBarcode}
        products={products}
        selectedLocation={selectedLocation}
        onClose={() => setUnknownBarcode(null)}
        onStartNewDraft={handleStartNewDraft}
        onAttachToExisting={handleAttachToExisting}
      />
    </div>
  );
}
