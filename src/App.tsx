import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Layout, type ActiveTab } from './components/Layout';
import { AuditLogsView } from './features/audit/components/AuditLogsView';
import { useInventoryLogs } from './features/audit/hooks/useInventoryLogs';
import { InventoryView } from './features/inventory/components/InventoryView';
import { ProductFormModal } from './features/inventory/components/ProductFormModal';
import { useProducts } from './features/inventory/hooks/useProducts';
import { ScannerView } from './features/scanner/components/ScannerView';
import { isSupabaseConfigured } from './lib/supabase';
import type { Product, ProductInsert } from './types/database';

function getInitialTab(): ActiveTab {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return 'scanner';
  }
  return 'inventory';
}

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [prefillBarcode, setPrefillBarcode] = useState('');

  const {
    products,
    loading: productsLoading,
    error: productsError,
    findByBarcode,
    createProduct,
    updateStock,
  } = useProducts();

  const {
    logs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useInventoryLogs();

  const handleOpenNewProduct = (barcode = '') => {
    setPrefillBarcode(barcode);
    setNewProductModalOpen(true);
  };

  const handleCreateProduct = async (input: ProductInsert) => {
    await createProduct(input);
    void refetchLogs();
  };

  const handleUpdateStockInline = async (product: Product, newStock: number) => {
    await updateStock(product, newStock);
    void refetchLogs();
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNewProduct={() => handleOpenNewProduct()}
    >
      {!isSupabaseConfigured && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <p className="font-semibold">Falta configurar la conexión a Supabase</p>
            <p className="text-amber-900/90">
              Copia <code className="rounded bg-amber-100 px-1 py-0.5">.env.example</code> a{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5">.env</code> con{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5">VITE_SUPABASE_URL</code> y{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code>, y
              ejecuta <code className="rounded bg-amber-100 px-1 py-0.5">supabase/schema.sql</code>{' '}
              en el SQL Editor de tu proyecto.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <InventoryView
          products={products}
          loading={productsLoading}
          error={productsError}
          onUpdateStock={handleUpdateStockInline}
          onRequestNewProduct={handleOpenNewProduct}
        />
      )}

      {activeTab === 'audit' && (
        <AuditLogsView
          logs={logs}
          loading={logsLoading}
          error={logsError}
          onRefresh={refetchLogs}
        />
      )}

      {activeTab === 'scanner' && (
        <ScannerView
          findByBarcode={findByBarcode}
          onApplyAudit={async (product, countedStock, type) => {
            const updated = await updateStock(product, countedStock, type);
            void refetchLogs();
            return updated;
          }}
          onCreateProduct={async (input) => {
            const created = await createProduct(input);
            void refetchLogs();
            return created;
          }}
        />
      )}

      <ProductFormModal
        open={newProductModalOpen}
        initialBarcode={prefillBarcode}
        onClose={() => setNewProductModalOpen(false)}
        onSubmit={handleCreateProduct}
      />
    </Layout>
  );
}

export default App;
