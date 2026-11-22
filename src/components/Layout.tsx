import type { ReactNode } from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  Package,
  Plus,
  ScanBarcode,
} from 'lucide-react';

export type ActiveTab = 'inventory' | 'stocktake' | 'audit' | 'scanner';

interface LayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewProduct: () => void;
  children: ReactNode;
}

export function Layout({
  activeTab,
  onTabChange,
  onNewProduct,
  children,
}: LayoutProps) {
  return (
    <div className="min-h-dvh bg-white text-zinc-950">
      {/* Barra superior limpia para PC */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 text-white">
                <ScanBarcode className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-zinc-950">Stock</span>
            </div>

            {/* Navegación PC */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
              <button
                type="button"
                onClick={() => onTabChange('inventory')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                }`}
              >
                <Package className="h-4 w-4" />
                Inventario
              </button>

              <button
                type="button"
                onClick={() => onTabChange('stocktake')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                  activeTab === 'stocktake'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                }`}
              >
                <ClipboardCheck className="h-4 w-4" />
                Conteo / Auditoría
              </button>

              <button
                type="button"
                onClick={() => onTabChange('audit')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                  activeTab === 'audit'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Descuadres / Historial
              </button>

              <button
                type="button"
                onClick={() => onTabChange('scanner')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                  activeTab === 'scanner'
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                }`}
              >
                <ScanBarcode className="h-4 w-4" />
                Escáner
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Acceso discreto a historial en móvil */}
            <button
              type="button"
              onClick={() => onTabChange('audit')}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium md:hidden ${
                activeTab === 'audit'
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Historial
            </button>

            {/* Botón Nuevo Producto en PC */}
            <button
              type="button"
              onClick={onNewProduct}
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal con espacio inferior en móvil para la barra fija */}
      <main className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-6 md:pb-10">{children}</main>

      {/* Barra inferior móvil con botones táctiles grandes (>= 48px) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-2.5 py-2 backdrop-blur-xs md:hidden"
        aria-label="Navegación móvil"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onTabChange('scanner')}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'scanner'
                ? 'bg-zinc-950 text-white'
                : 'border border-zinc-200 bg-white text-zinc-700 active:bg-zinc-100'
            }`}
          >
            <ScanBarcode className="h-4 w-4" />
            Escanear
          </button>

          <button
            type="button"
            onClick={() => onTabChange('stocktake')}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'stocktake'
                ? 'bg-zinc-950 text-white'
                : 'border border-zinc-200 bg-white text-zinc-700 active:bg-zinc-100'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            Conteo
          </button>

          <button
            type="button"
            onClick={() => onTabChange('inventory')}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'inventory'
                ? 'bg-zinc-950 text-white'
                : 'border border-zinc-200 bg-white text-zinc-700 active:bg-zinc-100'
            }`}
          >
            <Package className="h-4 w-4" />
            Inventario
          </button>
        </div>
      </nav>
    </div>
  );
}
