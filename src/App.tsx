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
  getInvoices,
  createInvoice,
} from "./services/invoices";

import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from "./services/payments";

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
  const { userRole, user } = useAuth();

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

// Master State
const [parties, setParties] = useState<Party[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [payments, setPayments] = useState<Payment[]>([]);
const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
const [invoices, setInvoices] = useState<Invoice[]>([]);

// ------------------------------------------------------------
// Invoice payment synchronization
// ------------------------------------------------------------

const syncInvoicesWithPayments = (
  currentInvoices: Invoice[],
  currentPayments: Payment[]
): Invoice[] => {

  // ------------------------------------------------------------
  // STEP 1:
  // Calculate explicitly invoice-linked payments.
  // ------------------------------------------------------------

  const invoicePaidMap = new Map<string, number>();

  currentPayments
    .filter(
      (payment) =>
        payment.status !== 'Pending' &&
        payment.invoiceNumber
    )
    .forEach((payment) => {
      const key = `${payment.partyId}-${payment.invoiceNumber!
        .trim()
        .toLowerCase()}`;

      invoicePaidMap.set(
        key,
        (invoicePaidMap.get(key) || 0) +
          Number(payment.amount || 0)
      );
    });

  // ------------------------------------------------------------
  // STEP 2:
  // Calculate unallocated customer advances.
  //
  // Payments without invoiceNumber are advances.
  // ------------------------------------------------------------

  const advancesByCustomer = new Map<string, number>();

  currentPayments
    .filter(
      (payment) =>
        payment.status !== 'Pending' &&
        !payment.invoiceNumber
    )
    .forEach((payment) => {
      advancesByCustomer.set(
        payment.partyId,
        (advancesByCustomer.get(payment.partyId) || 0) +
          Number(payment.amount || 0)
      );
    });

  // ------------------------------------------------------------
  // STEP 3:
  // Sort invoices chronologically.
  //
  // Oldest outstanding invoice gets advance first.
  // ------------------------------------------------------------

  const sortedInvoices = [...currentInvoices].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });

  // ------------------------------------------------------------
  // STEP 4:
  // Apply customer advances to outstanding invoices.
  // ------------------------------------------------------------

  const advanceRemaining = new Map(
    advancesByCustomer
  );

  const advanceAllocation = new Map<string, number>();

  sortedInvoices.forEach((invoice) => {

    const invoiceKey =
      `${invoice.partyId}-${invoice.invoiceNumber
        .trim()
        .toLowerCase()}`;

    const linkedPaid =
      invoicePaidMap.get(invoiceKey) || 0;

    const invoiceTotal =
      Number(invoice.grandTotal || 0);

    const outstandingBeforeAdvance =
      Math.max(invoiceTotal - linkedPaid, 0);

    if (outstandingBeforeAdvance <= 0) {
      return;
    }

    const customerAdvance =
      advanceRemaining.get(invoice.partyId) || 0;

    if (customerAdvance <= 0) {
      return;
    }

    const amountFromAdvance =
      Math.min(
        outstandingBeforeAdvance,
        customerAdvance
      );

    advanceAllocation.set(
      invoiceKey,
      amountFromAdvance
    );

    advanceRemaining.set(
      invoice.partyId,
      customerAdvance - amountFromAdvance
    );
  });

  // ------------------------------------------------------------
  // STEP 5:
  // Calculate final invoice status.
  // ------------------------------------------------------------

  return currentInvoices.map((invoice) => {

    const invoiceKey =
      `${invoice.partyId}-${invoice.invoiceNumber
        .trim()
        .toLowerCase()}`;

    const linkedPaid =
      invoicePaidMap.get(invoiceKey) || 0;

    const advancePaid =
      advanceAllocation.get(invoiceKey) || 0;

    const paidAmount =
      linkedPaid + advancePaid;

    const grandTotal =
      Number(invoice.grandTotal || 0);

    let status: Invoice['status'] = 'Unpaid';

    if (paidAmount >= grandTotal) {
      status = 'Paid';
    } else if (paidAmount > 0) {
      status = 'Partially Paid';
    }

    return {
      ...invoice,
      paidAmount,
      status,
    };
  });
};

// ------------------------------------------------------------
// Data loaders
// ------------------------------------------------------------

const loadCustomers = async () => {
  try {
    const data = await getCustomers();
    setParties(data);
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
};

const loadProducts = async () => {
  try {
    const data = await getProducts();
    setProducts(data);
  } catch (err) {
    console.error('Failed to load products:', err);
  }
};

const loadInvoices = async () => {
  try {
    const [invoiceData, paymentData] = await Promise.all([
      getInvoices(),
      getPayments(),
    ]);

    // Keep payment state synchronized with invoice state.
    setPayments(paymentData);

    const syncedInvoices = syncInvoicesWithPayments(
      invoiceData,
      paymentData
    );

    setInvoices(syncedInvoices);
  } catch (err) {
    console.error('Failed to load invoices:', err);
  }
};

const loadPayments = async () => {
  try {
    const data = await getPayments();
    setPayments(data);
  } catch (err) {
    console.error('Failed to load payments:', err);
  }
};

// ------------------------------------------------------------
// Initial data load
// ------------------------------------------------------------

useEffect(() => {
  void loadProducts();
  void loadCustomers();
  void loadInvoices();

}, []);



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
    const isProductBilled = invoices.some((inv) =>
      inv.items.some((item) => item.productId === productId)
    );

    if (isProductBilled) {
      const errMsg = "Cannot delete product because it is already referenced in active billing invoices. You can edit its details instead.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    await deleteProduct(productId);
    await loadProducts();
  } catch (err) {
    console.error("Failed to delete product:", err);
    if (!(err instanceof Error && err.message.includes("referenced in active billing invoices"))) {
      alert(err instanceof Error ? err.message : "Failed to delete product.");
    }
    throw err;
  }
};


  // Payment Handlers with Automatic Invoice Sync
const handleAddPayment = async (newPayment: Payment) => {
  try {
    if (!user?.profile.id) {
      throw new Error("Authenticated profile not found.");
    }

    await createPayment(
      newPayment,
      user.profile.id
    );

    const updatedPayments = await getPayments();

    setPayments(updatedPayments);

    setInvoices((prevInvoices) =>
      syncInvoicesWithPayments(
        prevInvoices,
        updatedPayments
      )
    );
  } catch (err) {
  console.error("Failed to add payment:", err);

  alert(
    err instanceof Error
      ? err.message
      : "Failed to add payment."
  );
}
};

const handleUpdatePayment = async (
  updatedPayment: Payment
) => {
  try {
    await updatePayment(
      updatedPayment.id,
      updatedPayment
    );

    const updatedPayments = await getPayments();

    setPayments(updatedPayments);

    setInvoices((prevInvoices) =>
      syncInvoicesWithPayments(
        prevInvoices,
        updatedPayments
      )
    );
 } catch (err) {
  console.error("Failed to update payment:", err);

  alert(
    err instanceof Error
      ? err.message
      : "Failed to delete payment."
  );
}
};

const handleDeletePayment = async (
  paymentId: string
) => {
  try {
    await deletePayment(paymentId);

    const updatedPayments = await getPayments();

    setPayments(updatedPayments);

    setInvoices((prevInvoices) =>
      syncInvoicesWithPayments(
        prevInvoices,
        updatedPayments
      )
    );
  } catch (err) {
  console.error("Failed to delete payment:", err);

  alert(
    err instanceof Error
      ? err.message
      : "Failed to delete payment."
  );
}
};

  // Invoice Handler
const handleCreateInvoice = async (newInvoice: Invoice) => {
  if (!user?.profile?.id) {
    throw new Error("Authenticated user profile not found.");
  }

  await createInvoice(newInvoice, user.profile.id);
  await loadInvoices();
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
    const hasInvoices = invoices.some(inv => inv.partyId === partyId);
    const hasPayments = payments.some(p => p.partyId === partyId);

    if (hasInvoices || hasPayments) {
      alert("Cannot delete customer because they have active billing invoices or payments. You can block/deactivate them instead to restrict billing.");
      return;
    }

    await deleteCustomer(partyId);
    await loadCustomers();
  } catch (err) {
    console.error("Failed to delete customer:", err);
    alert(err instanceof Error ? err.message : "Failed to delete customer.");
  }
};

const handleToggleBlock = async (partyId: string) => {
  try {
    const party = parties.find(p => p.id === partyId);

    if (!party) {
      throw new Error("Customer not found.");
    }

    await updateCustomer(partyId, {
      isBlocked: !party.isBlocked,
    });

    await loadCustomers();
  } catch (err) {
    console.error("Failed to update customer status:", err);

    alert(
      err instanceof Error
        ? err.message
        : "Failed to update customer status."
    );
  }
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
               invoices={invoices}
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
            />
          )}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
