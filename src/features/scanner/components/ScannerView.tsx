import { useCallback, useState, type FormEvent } from 'react';
import { CheckCircle2, Keyboard } from 'lucide-react';
import type { InventoryLogType, Product, ProductInsert } from '../../../types/database';
import { triggerScanFeedback } from '../../../utils/feedback';
import { QuickCreateModal } from './QuickCreateModal';
import { ScannedProductCard, type CountMode } from './ScannedProductCard';
import { ScannerCamera } from './ScannerCamera';

interface ScannerViewProps {
  findByBarcode: (barcode: string) => Product | undefined;
  onApplyAudit: (product: Product, countedStock: number, type: InventoryLogType) => Promise<Product>;
  onCreateProduct: (input: ProductInsert) => Promise<Product>;
}

export function ScannerView({
  findByBarcode,
  onApplyAudit,
  onCreateProduct,
}: ScannerViewProps) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [countedStock, setCountedStock] = useState<number>(0);
  const [mode, setMode] = useState<CountMode>('increment');
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((curr) => (curr === msg ? null : curr));
    }, 2600);
  }, []);

  const handleBarcodeDetected = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || unknownBarcode) return;

      setErrorMessage(null);
      const found = findByBarcode(code);

      if (!found) {
        triggerScanFeedback('new');
        setUnknownBarcode(code);
        return;
      }

      triggerScanFeedback('success');

      if (activeProduct && activeProduct.id === found.id) {
        if (mode === 'increment') {
          setCountedStock((prev) => prev + 1);
        }
        return;
      }

      setActiveProduct(found);
      setCountedStock(mode === 'increment' ? 1 : found.stock_current);
    },
    [activeProduct, findByBarcode, mode, unknownBarcode],
  );

  const handleManualLookup = (e: FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode);
    setManualCode('');
  };

  const handleApplyCount = async () => {
    if (!activeProduct) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await onApplyAudit(activeProduct, countedStock, 'audit');
      const diff = countedStock - activeProduct.stock_current;
      const diffLabel = diff === 0 ? 'sin descuadre' : diff > 0 ? `+${diff}` : `${diff}`;
      showStatus(`Recuento aplicado en "${activeProduct.name}" (${countedStock} uds, ${diffLabel}).`);
      setActiveProduct(null);
      setCountedStock(0);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo aplicar el recuento.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickCreate = async (input: ProductInsert) => {
    const created = await onCreateProduct(input);
    showStatus(`Producto "${created.name}" creado con ${created.stock_current} uds.`);
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950">Escáner rápido</h1>
          <p className="text-xs text-zinc-500">
            Apunta al código EAN-13, EAN-8, UPC-A o Code 128.
          </p>
        </div>
      </div>

      {/* Visor de cámara trasera */}
      <ScannerCamera active={!unknownBarcode} onScan={handleBarcodeDetected} />

      {/* Mensajes de confirmación / error */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Tarjeta de producto escaneado o estado en espera */}
      {activeProduct ? (
        <ScannedProductCard
          product={activeProduct}
          countedStock={countedStock}
          mode={mode}
          saving={saving}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            if (nextMode === 'manual' && countedStock === 0) {
              setCountedStock(activeProduct.stock_current);
            }
          }}
          onCountChange={setCountedStock}
          onApply={handleApplyCount}
          onCancel={() => {
            setActiveProduct(null);
            setCountedStock(0);
          }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-5 text-center">
          <p className="text-sm font-medium text-zinc-800">Listo para escanear</p>
          <p className="mt-1 text-xs text-zinc-500">
            Si el producto existe podrás contar en modo +1 o manual. Si es nuevo se abrirá el alta rápida.
          </p>
        </div>
      )}

      {/* Entrada manual de respaldo si la etiqueta está dañada */}
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
          Buscar
        </button>
      </form>

      {/* Modal rápido para códigos no registrados */}
      <QuickCreateModal
        barcode={unknownBarcode}
        onClose={() => setUnknownBarcode(null)}
        onCreate={handleQuickCreate}
      />
    </div>
  );
}
