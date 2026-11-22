import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Layout, type ActiveTab } from './components/Layout';
import { appConfig, type ProductLocation } from './config/appConfig';
import { AuditLogsView } from './features/audit/components/AuditLogsView';
import { useInventoryLogs } from './features/audit/hooks/useInventoryLogs';
import { EditProductModal } from './features/inventory/components/EditProductModal';
import { InventoryView } from './features/inventory/components/InventoryView';
import { ProductFormModal } from './features/inventory/components/ProductFormModal';
import {
  useProducts,
  type UpdateProductInput,
} from './features/inventory/hooks/useProducts';
import { ScannerView } from './features/scanner/components/ScannerView';
import { StocktakeView } from './features/stocktake/components/StocktakeView';
import { isSupabaseConfigured } from './lib/supabase';
import type { ProductInsert, ProductWithBarcodes } from './types/database';

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
  const [prefillLocation, setPrefillLocation] = useState<ProductLocation>(
    appConfig.DEFAULT_LOCATION,
  );
  const [editingProduct, setEditingProduct] = useState<ProductWithBarcodes | null>(null);

  const {
    products,
    loading: productsLoading,
    error: productsError,
    findByBarcode,
    createProduct,
    updateProduct,
    updateStock,
    commitScannerSession,
    deleteProduct,
  } = useProducts();

  const {
    logs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useInventoryLogs();

  const handleOpenNewProduct = (
    barcode = '',
    location: ProductLocation = appConfig.DEFAULT_LOCATION,
  ) => {
    setPrefillBarcode(barcode);
    setPrefillLocation(location);
    setNewProductModalOpen(true);
  };

  const handleCreateProduct = async (input: ProductInsert) => {
    await createProduct(input);
    void refetchLogs();
  };

  const handleUpdateStockInline = async (product: ProductWithBarcodes, newStock: number) => {
    await updateStock(product, newStock);
    void refetchLogs();
  };

  const handleSaveEditedProduct = async (
    product: ProductWithBarcodes,
    updates: UpdateProductInput,
  ) => {
    await updateProduct(product, updates);
    void refetchLogs();
  };

  const handleDeleteProduct = async (product: ProductWithBarcodes) => {
    await deleteProduct(product.id);
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
          onEditProduct={(product) => setEditingProduct(product)}
          onRequestNewProduct={handleOpenNewProduct}
        />
      )}

      {activeTab === 'stocktake' && (
        <StocktakeView products={products} findByBarcode={findByBarcode} />
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
          products={products}
          findByBarcode={findByBarcode}
          onCommitSession={async (payload) => {
            const saved = await commitScannerSession(payload);
            void refetchLogs();
            return saved;
          }}
        />
      )}

      <ProductFormModal
        open={newProductModalOpen}
        initialBarcode={prefillBarcode}
        initialLocation={prefillLocation}
        onClose={() => setNewProductModalOpen(false)}
        onSubmit={handleCreateProduct}
      />

      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleSaveEditedProduct}
        onDelete={handleDeleteProduct}
      />
    </Layout>
  );
}

export default App;
