import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link2, MapPin, Plus, Search, X } from 'lucide-react';
import {
  appConfig,
  PRODUCT_LOCATIONS,
  type ProductLocation,
} from '../../../config/appConfig';
import type { ProductWithBarcodes } from '../../../types/database';

export interface NewProductDraft {
  barcode: string;
  name: string;
  category: string | null;
  location: ProductLocation;
  stockMin: number;
}

interface QuickCreateModalProps {
  barcode: string | null;
  products: ProductWithBarcodes[];
  selectedLocation: ProductLocation | 'all';
  onClose: () => void;
  onStartNewDraft: (draft: NewProductDraft) => void;
  onAttachToExisting: (product: ProductWithBarcodes, barcode: string) => void;
}

type ModalTab = 'new' | 'attach';

export function QuickCreateModal({
  barcode,
  products,
  selectedLocation,
  onClose,
  onStartNewDraft,
  onAttachToExisting,
}: QuickCreateModalProps) {
  const [tab, setTab] = useState<ModalTab>('new');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<ProductLocation>(
    selectedLocation === 'all' ? appConfig.DEFAULT_LOCATION : selectedLocation,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (barcode) {
      setTab('new');
      setName('');
      setCategory('');
      setLocation(
        selectedLocation === 'all' ? appConfig.DEFAULT_LOCATION : selectedLocation,
      );
      setSearchQuery('');
      setShowAllLocations(false);
      setError(null);
    }
  }, [barcode, selectedLocation]);

  const matchingProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const scoped =
      selectedLocation !== 'all' && !showAllLocations
        ? products.filter((p) => p.location === selectedLocation)
        : products;

    if (!q) return scoped.slice(0, 12);
    return scoped
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          p.barcodes.some((code) => code.toLowerCase().includes(q)),
      )
      .slice(0, 15);
  }, [products, searchQuery, selectedLocation, showAllLocations]);

  if (!barcode) return null;

  const handleSubmitNew = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Escribe el nombre del producto o grupo (ej. Proteína Whey Nova 1 kg).');
      return;
    }

    onStartNewDraft({
      barcode,
      name: name.trim(),
      category: category.trim() || null,
      location,
      stockMin: appConfig.DEFAULT_STOCK_MIN,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-3 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-create-title"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
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

        {/* Selector: Nuevo grupo/producto vs Asociar a producto existente */}
        {products.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('new');
                setError(null);
              }}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === 'new'
                  ? 'bg-white text-zinc-950 ring-1 ring-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo producto
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('attach');
                setError(null);
              }}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === 'attach'
                  ? 'bg-white text-zinc-950 ring-1 ring-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Añadir a existente
            </button>
          </div>
        )}

        {tab === 'new' ? (
          <form onSubmit={handleSubmitNew} className="space-y-3.5">
            <div>
              <label htmlFor="quick-name" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Nombre del producto / grupo
              </label>
              <input
                id="quick-name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Proteína Whey Nova 1 kg"
                className="min-h-[48px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-base text-zinc-950 outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                Ubicación
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {PRODUCT_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`min-h-[44px] rounded-lg border px-3 text-xs font-medium transition-colors ${
                      location === loc
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="quick-category"
                className="mb-1.5 block text-xs font-medium text-zinc-700"
              >
                Categoría <span className="text-zinc-400">(opcional)</span>
              </label>
              <input
                id="quick-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Proteínas, Suplementación..."
                className="min-h-[48px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </div>

            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Se abrirá en <strong>borrador</strong> (sin guardar todavía) para que puedas seguir
              escaneando otros sabores y guardar todo al pulsar <strong>Aceptar</strong>.
            </p>

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
                className="min-h-[48px] rounded-lg bg-zinc-950 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Empezar recuento
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto existente (ej. Whey Nova)..."
                className="min-h-[48px] w-full rounded-lg border border-zinc-200 bg-white pr-3 pl-9 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </div>

            {selectedLocation !== 'all' && (
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Mostrando: <strong>{showAllLocations ? 'Todas' : selectedLocation}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllLocations((prev) => !prev)}
                  className="font-medium text-zinc-900 underline underline-offset-2"
                >
                  {showAllLocations ? `Solo ${selectedLocation}` : 'Ver todas las zonas'}
                </button>
              </div>
            )}

            <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
              {matchingProducts.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-500">
                  No se encontraron productos en esta vista.
                </p>
              ) : (
                matchingProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onAttachToExisting(product, barcode)}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-zinc-900 hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">{product.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {product.location} · Stock: {product.stock_current} ·{' '}
                        {product.barcodes.length}{' '}
                        {product.barcodes.length === 1 ? 'código' : 'códigos'}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700">
                      Seleccionar
                    </span>
                  </button>
                ))
              )}
            </div>

            <p className="text-[11px] text-zinc-500">
              Este código se vinculará como nuevo sabor al pulsar <strong>Aceptar</strong> en el
              recuento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
