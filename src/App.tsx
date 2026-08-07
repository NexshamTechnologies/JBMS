import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { BillingModule } from './components/BillingModule';
import { AnalyticsModule } from './components/AnalyticsModule';

import { Auth } from './components/Auth';
import { CustomersModule } from './components/CustomersModule';
import { ProductCatalogModule } from './components/ProductCatalogModule';
import { PaymentsModule } from './components/PaymentsModule';
import { CustomerLedgerModule } from './components/CustomerLedgerModule';
import { SettingsModule } from './components/SettingsModule';
import { BackupRestoreModule, BackupData } from './components/BackupRestoreModule';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ToastProvider';


import {
  Party,
  Invoice,
  LedgerEntry,
  Product,
  Payment,
  ROLE_PERMISSIONS
} from './types';


import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./services/products";


import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "./services/customers";


// ---------------------------------------------------------------------------
// Inner app — only rendered when the user is authenticated
// ---------------------------------------------------------------------------
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#050505',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(37,99,235,0.2)',
            borderTopColor: '#2563eb',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '12px', color: 'rgba(209,209,209,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Loading...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <App />;
}

// ---------------------------------------------------------------------------
// Root export — wraps everything with AuthProvider
// ---------------------------------------------------------------------------
export default function Root() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Main application shell with Role-Based Access Control
// ---------------------------------------------------------------------------
function App() {
  const { userRole } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [globalSearch, setGlobalSearch] = useState<string>('');


  // Role permissions protection
  const allowedTabs = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.Owner;

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab, allowedTabs]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  });

const loadCustomers = async () => {
  try {
    const data = await getCustomers();
    setParties(data);
  } catch (err) {
    console.error(err);
  }
};

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
      }
      return next;
    });
  };

  // Modal State
  const [isOpenNewInvoiceModal, setIsOpenNewInvoiceModal] = useState<boolean>(false);

// Master State
// Frontend-only phase: application starts with no business data.
// Real persistence will be connected later.

const [parties, setParties] = useState<Party[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [payments, setPayments] = useState<Payment[]>([]);
const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
const [invoices, setInvoices] = useState<Invoice[]>([]);

const loadProducts = async () => {
  try {
    const data = await getProducts();
    setProducts(data);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  loadProducts();
   loadCustomers();
}, []);

  // Payment & Invoice synchronization helper
  const syncInvoicesWithPayments = (currentInvoices: Invoice[], currentPayments: Payment[]): Invoice[] => {
    return currentInvoices.map((inv) => {
      const linkedPayments = currentPayments.filter(
        (p) =>
          p.invoiceNumber &&
          p.invoiceNumber.trim().toLowerCase() === inv.invoiceNumber.trim().toLowerCase() &&
          p.status !== 'Pending'
      );
      const paidAmount = linkedPayments.reduce((sum, p) => sum + p.amount, 0);
      let status: Invoice['status'] = 'Unpaid';
      if (paidAmount >= inv.grandTotal) {
        status = 'Paid';
      } else if (paidAmount > 0) {
        status = 'Partially Paid';
      } else {
        status = 'Unpaid';
      }
      return {
        ...inv,
        paidAmount,
        status
      };
    });
  };

const handleAddProduct = async (newProduct: Product) => {
  try {
    await createProduct(newProduct);
    await loadProducts();
    console.log("Products reloaded");
  } catch (err) {
    console.error(err);
  }
};


const handleUpdateProduct = async (
  updatedProduct: Product
) => {
  try {
    await updateProduct(
      updatedProduct.id,
      updatedProduct
    );

    await loadProducts();
  } catch (err) {
    console.error(err);
  }
};

const handleDeleteProduct = async (
  productId: string
) => {
  try {
    await deleteProduct(productId);

    await loadProducts();
  } catch (err) {
    console.error(err);
  }
};


  // Payment Handlers with Automatic Invoice Sync
  const handleAddPayment = (newPayment: Payment) => {
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    setInvoices((prevInvoices) => syncInvoicesWithPayments(prevInvoices, updatedPayments));
  };

  const handleUpdatePayment = (updatedPayment: Payment) => {
    const updatedPayments = payments.map(p => (p.id === updatedPayment.id ? updatedPayment : p));
    setPayments(updatedPayments);
    setInvoices((prevInvoices) => syncInvoicesWithPayments(prevInvoices, updatedPayments));
  };

  const handleDeletePayment = (paymentId: string) => {
    const updatedPayments = payments.filter(p => p.id !== paymentId);
    setPayments(updatedPayments);
    setInvoices((prevInvoices) => syncInvoicesWithPayments(prevInvoices, updatedPayments));
  };

  // Invoice Handler
  const handleCreateInvoice = (newInvoice: Invoice) => {
    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(syncInvoicesWithPayments(updatedInvoices, payments));
  };

  // Party Handlers (Customers)
const handleAddParty = async (newParty: Party) => {
  try {
    await createCustomer(newParty);
    await loadCustomers();
  } catch (err) {
    console.error(err);
  }
};

const handleUpdateParty = async (updatedParty: Party) => {
  try {
    await updateCustomer(updatedParty.id, updatedParty);
    await loadCustomers();
  } catch (err) {
    console.error(err);
  }
};

const handleDeleteParty = async (partyId: string) => {
  try {
    await deleteCustomer(partyId);
    await loadCustomers();
  } catch (err) {
    console.error(err);
  }
};

  const handleToggleBlock = (partyId: string) => {
    setParties(
      parties.map(p =>
        p.id === partyId ? { ...p, isBlocked: !p.isBlocked } : p
      )
    );
  };

  // Backup & Restore Handlers
  const handleRestoreAll = (restoredData: BackupData) => {
    if (restoredData.parties) setParties(restoredData.parties);
    if (restoredData.ledgerEntries) setLedgerEntries(restoredData.ledgerEntries);
    if (restoredData.products) setProducts(restoredData.products);
    if (restoredData.payments) setPayments(restoredData.payments);
    if (restoredData.invoices) {
      setInvoices(syncInvoicesWithPayments(restoredData.invoices, restoredData.payments || payments));
    }
    
  };

const handleResetToDefaults = () => {
  setParties([]);
  setLedgerEntries([]);
  setProducts([]);
  setPayments([]);
  setInvoices([]);
};

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Fixed Header */}
        <Header
          searchTerm={globalSearch}
          setSearchTerm={setGlobalSearch}
          activeTab={activeTab}
          theme={theme}
          toggleTheme={toggleTheme}
        />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unpaidInvoicesCount={
            invoices.filter((inv) => inv.status !== 'Paid').length
          }
          userRole={userRole}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && allowedTabs.includes('dashboard') && (
            <Dashboard
              invoices={invoices}
              parties={parties}
              payments={payments}
              products={products}
              onNavigate={(tab) => {
                if (allowedTabs.includes(tab)) {
                  setActiveTab(tab);
                }
              }}
              onOpenNewInvoice={() => {
                if (allowedTabs.includes('billing')) {
                  setActiveTab('billing');
                  setIsOpenNewInvoiceModal(true);
                }
              }}

            />
          )}

          {activeTab === 'billing' && allowedTabs.includes('billing') && (
            <BillingModule
              invoices={invoices}
              parties={parties}
              payments={payments}
              products={products}
              onCreateInvoice={handleCreateInvoice}
              onAddPayment={handleAddPayment}
              searchTerm={globalSearch}
              setSearchTerm={setGlobalSearch}
              isOpenNewInvoiceModal={isOpenNewInvoiceModal}
              setIsOpenNewInvoiceModal={setIsOpenNewInvoiceModal}
            />
          )}

          {activeTab === 'product-catalog' && allowedTabs.includes('product-catalog') && (
            <ProductCatalogModule
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              searchTerm={globalSearch}
              setSearchTerm={setGlobalSearch}
            />
          )}

          {activeTab === 'analytics' && allowedTabs.includes('analytics') && (
            <AnalyticsModule
              salesOrders={[]}
              fabricRolls={[]}
              invoices={invoices}
              parties={parties}
              payments={payments}
              products={products}
              theme={theme}
            />
          )}

          {activeTab === 'customers' && allowedTabs.includes('customers') && (
            <CustomersModule
              parties={parties}
              onAddParty={handleAddParty}
              onUpdateParty={handleUpdateParty}
              onDeleteParty={handleDeleteParty}
              onToggleBlock={handleToggleBlock}
              searchTerm={globalSearch}
              setSearchTerm={setGlobalSearch}
            />
          )}

          {activeTab === 'payments' && allowedTabs.includes('payments') && (
            <PaymentsModule
              payments={payments}
              parties={parties}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
              searchTerm={globalSearch}
              setSearchTerm={setGlobalSearch}
            />
          )}

          {activeTab === 'customer-ledger' && allowedTabs.includes('customer-ledger') && (
            <CustomerLedgerModule
              parties={parties}
              ledgerEntries={ledgerEntries}
              invoices={invoices}
              payments={payments}
              searchTerm={globalSearch}
              setSearchTerm={setGlobalSearch}
            />
          )}

          {activeTab === 'settings' && allowedTabs.includes('settings') && (
            <SettingsModule />
          )}

          {activeTab === 'backup' && allowedTabs.includes('backup') && (
            <BackupRestoreModule
              data={{
                parties,
                invoices,
                ledgerEntries,
                products,
                payments
              }}
              onRestoreAll={handleRestoreAll}
              onResetToDefaults={handleResetToDefaults}
            />
          )}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
