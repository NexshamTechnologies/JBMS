import React, { useState, useMemo, useEffect } from 'react';
import { getCompanySettings, CompanySettingsDB } from '../services/settings';
import {
  BookOpen,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Printer,
  Download,
  Calendar,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  IndianRupee,
  ChevronRight,
  Receipt,
  CreditCard,
  AlertCircle,
  Menu
} from 'lucide-react';
import { Party, LedgerEntry, Invoice, Payment } from '../types';

interface CustomerLedgerModuleProps {
  parties: Party[];
  ledgerEntries: LedgerEntry[];
  invoices: Invoice[];
  payments: Payment[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

type ActiveTab = 'ledger' | 'invoices' | 'payments';

const fmt = (n: number) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusColors: Record<string, string> = {
  Paid:           'bg-emerald-500/15 text-emerald-500',
  Unpaid:         'bg-rose-500/15 text-rose-500',
  'Partially Paid': 'bg-amber-500/15 text-amber-500',
  Overdue:        'bg-rose-600/20 text-rose-500',
  Completed:      'bg-emerald-500/15 text-emerald-500',
  Pending:        'bg-amber-500/15 text-amber-500',
  Partial:        'bg-blue-500/15 text-blue-500',
  Advance:        'bg-indigo-500/15 text-indigo-500',
};

export const CustomerLedgerModule: React.FC<CustomerLedgerModuleProps> = ({
  parties,
  ledgerEntries,
  invoices,
  payments,
  searchTerm,
  setSearchTerm,
}) => {
  const customers = parties.filter(p => p.type === 'Customer');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [customers, searchTerm]
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

    // ------------------------------------------------------------
  // DERIVED CUSTOMER TRANSACTIONS
  //
  // We intentionally derive the ledger from persisted invoices
  // and payments instead of relying on the currently-empty
  // frontend ledgerEntries state.
  // ------------------------------------------------------------

  const derivedLedger = useMemo<LedgerEntry[]>(() => {
    if (!selectedCustomerId) return [];

    const transactions: Array<{
      id: string;
      partyId: string;
      date: string;
      voucherType: LedgerEntry['voucherType'];
      voucherNumber: string;
      narration: string;
      debit: number;
      credit: number;
      sortOrder: number;
    }> = [];

    // ----------------------------------------------------------
    // INVOICES = DEBIT
    // Customer owes us more after a sale.
    // ----------------------------------------------------------

    invoices
      .filter(invoice => invoice.partyId === selectedCustomerId)
      .forEach(invoice => {
        transactions.push({
          id: `invoice-${invoice.id}`,
          partyId: invoice.partyId,
          date: invoice.date,
          voucherType: 'Sales Invoice',
          voucherNumber: invoice.invoiceNumber,
          narration: `Sales invoice ${invoice.invoiceNumber}`,
          debit: Number(invoice.grandTotal) || 0,
          credit: 0,

          // Same-day invoices should appear before payments.
          sortOrder: 1,
        });
      });

    // ----------------------------------------------------------
    // PAYMENTS = CREDIT
    //
    // Pending payments are not treated as received money.
    // Partial / Completed / Advance all represent money received.
    // ----------------------------------------------------------

    payments
      .filter(
        payment =>
          payment.partyId === selectedCustomerId &&
          payment.status !== 'Pending'
      )
      .forEach(payment => {
        transactions.push({
          id: `payment-${payment.id}`,
          partyId: payment.partyId,
          date: payment.date,
          voucherType: 'Payment Receipt',
          voucherNumber: payment.paymentNumber,
          narration: payment.invoiceNumber
            ? `Payment received against ${payment.invoiceNumber}`
            : 'Advance payment received',
          debit: 0,
          credit: Number(payment.amount) || 0,

          // Same-day payments appear after invoices.
          sortOrder: 2,
        });
      });

    // ----------------------------------------------------------
    // DATE + TYPE ORDER
    // ----------------------------------------------------------

    transactions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.sortOrder - b.sortOrder;
    });

    // ----------------------------------------------------------
    // RUNNING BALANCE
    //
    // Positive = customer owes us (Dr)
    // Negative = we owe customer / customer has advance (Cr)
    // ----------------------------------------------------------

    let balance = 0;

    return transactions.map(transaction => {
      balance += transaction.debit - transaction.credit;

      return {
        id: transaction.id,
        partyId: transaction.partyId,
        date: transaction.date,
        voucherType: transaction.voucherType,
        voucherNumber: transaction.voucherNumber,
        narration: transaction.narration,
        debit: transaction.debit,
        credit: transaction.credit,
        runningBalance: balance,
      };
    });
  }, [invoices, payments, selectedCustomerId]);

  // Filtered data for selected customer
  const customerLedger = useMemo(() => {
    let entries = [...derivedLedger];

    if (dateFrom) {
      entries = entries.filter(e => e.date >= dateFrom);
    }

    if (dateTo) {
      entries = entries.filter(e => e.date <= dateTo);
    }

    return entries;
  }, [derivedLedger, dateFrom, dateTo]);


  const invoicePaymentMap = useMemo(() => {
  const map = new Map<string, number>();

  // ------------------------------------------------------------
  // 1. Explicit invoice-linked payments
  // ------------------------------------------------------------

  payments
    .filter(
      payment =>
        payment.partyId === selectedCustomerId &&
        payment.status !== 'Pending' &&
        payment.invoiceNumber
    )
    .forEach(payment => {
      const key = payment.invoiceNumber!
        .trim()
        .toLowerCase();

      map.set(
        key,
        (map.get(key) || 0) +
          Number(payment.amount || 0)
      );
    });

  // ------------------------------------------------------------
  // 2. Customer-level advance payments
  // ------------------------------------------------------------

  let advance =
    payments
      .filter(
        payment =>
          payment.partyId === selectedCustomerId &&
          payment.status !== 'Pending' &&
          !payment.invoiceNumber
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

  // ------------------------------------------------------------
  // 3. Apply advance to oldest invoices first
  // ------------------------------------------------------------

  const sortedInvoices = [...invoices]
    .filter(
      invoice =>
        invoice.partyId === selectedCustomerId
    )
    .sort((a, b) => {
      const dateCompare =
        a.date.localeCompare(b.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.invoiceNumber.localeCompare(
        b.invoiceNumber
      );
    });

  sortedInvoices.forEach(invoice => {

    const key =
      invoice.invoiceNumber
        .trim()
        .toLowerCase();

    const alreadyPaid =
      map.get(key) || 0;

    const outstanding =
      Math.max(
        Number(invoice.grandTotal || 0) -
          alreadyPaid,
        0
      );

    if (
      outstanding <= 0 ||
      advance <= 0
    ) {
      return;
    }

    const allocation =
      Math.min(outstanding, advance);

    map.set(
      key,
      alreadyPaid + allocation
    );

    advance -= allocation;
  });

  return map;
}, [
  payments,
  invoices,
  selectedCustomerId
]);

  const customerInvoices = useMemo(() => {
    let inv = invoices.filter(i => i.partyId === selectedCustomerId);
    if (dateFrom) inv = inv.filter(i => i.date >= dateFrom);
    if (dateTo) inv = inv.filter(i => i.date <= dateTo);
    return inv.sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, selectedCustomerId, dateFrom, dateTo]);

  const customerPayments = useMemo(() => {
    let pmts = payments.filter(p => p.partyId === selectedCustomerId);
    if (dateFrom) pmts = pmts.filter(p => p.date >= dateFrom);
    if (dateTo) pmts = pmts.filter(p => p.date <= dateTo);
    return pmts.sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, selectedCustomerId, dateFrom, dateTo]);

  // Summary stats
  const totalBilled = customerInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.grandTotal || 0),
    0
  );

  const totalPaid = customerPayments
    .filter(payment => payment.status !== 'Pending')
    .reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

  const outstanding = totalBilled - totalPaid;

   const totalDebit = customerLedger.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0
  );

  const totalCredit = customerLedger.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );

  const runningBalance =
    customerLedger.length > 0
      ? customerLedger[customerLedger.length - 1].runningBalance
      : 0;

  const openingBalance = useMemo(() => {
    if (!dateFrom) return 0;
    const priorEntries = derivedLedger.filter(e => e.date < dateFrom);
    if (priorEntries.length === 0) return 0;
    return priorEntries[priorEntries.length - 1].runningBalance;
  }, [derivedLedger, dateFrom]);
  // Export CSV
  const exportCSV = () => {
    if (!selectedCustomer) return;
    const rows = [
      ['Date', 'Voucher No', 'Type', 'Narration', 'Debit', 'Credit', 'Balance'],
      ...customerLedger.map(e => [
        e.date,
        e.voucherNumber,
        e.voucherType,
        e.narration,
        e.debit.toString(),
        e.credit.toString(),
        e.runningBalance.toString()
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${selectedCustomer.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isOpenPrintPreview, setIsOpenPrintPreview] = useState(false);
  const [company, setCompany] = useState<CompanySettingsDB | null>(null);

  useEffect(() => {
    async function loadCompany() {
      try {
        const companyData = await getCompanySettings(1); // Load Profile 1 by default
        if (companyData) {
          setCompany(companyData);
        }
      } catch (err) {
        console.error('Failed to load company settings in ledger print:', err);
      }
    }
    loadCompany();
  }, []);

  // Inject print styles directly into document.head to ensure clean evaluation in print preview
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'ledger-print-overrides';
    styleEl.innerHTML = `
      #print-section {
        display: none !important;
      }
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        html, body {
          background: white !important;
          background-color: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
        }
        #root {
          display: none !important;
        }
        #print-section {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          background-color: white !important;
        }
        #printable-ledger-clone {
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: white !important;
          background-color: white !important;
          color: black !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      const el = document.getElementById('ledger-print-overrides');
      if (el) {
        document.head.removeChild(el);
      }
      const printSec = document.getElementById('print-section');
      if (printSec) {
        document.body.removeChild(printSec);
      }
    };
  }, []);

  // Print ledger using cloned DOM node to body to bypass React nested container clipping
  const handlePrint = () => {
    let printSection = document.getElementById('print-section');
    if (!printSection) {
      printSection = document.createElement('div');
      printSection.id = 'print-section';
      document.body.appendChild(printSection);
    }

    const ledgerEl = document.getElementById('printable-ledger-sheet');
    if (ledgerEl) {
      const clone = ledgerEl.cloneNode(true) as HTMLElement;
      clone.id = 'printable-ledger-clone';
      printSection.innerHTML = '';
      printSection.appendChild(clone);
    }

    window.print();

    if (printSection) {
      printSection.innerHTML = '';
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'ledger',   label: 'Ledger',   icon: BookOpen,  count: customerLedger.length },
    { id: 'invoices', label: 'Invoices', icon: Receipt,   count: customerInvoices.length },
    { id: 'payments', label: 'Payments', icon: CreditCard, count: customerPayments.length },
  ];

  return (
    <>
      {!selectedCustomer ? (
        /* Center-aligned selection page when no customer is selected */
        <div className="max-w-2xl mx-auto w-full py-8 print:hidden">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <BookOpen className="w-6 h-6 text-blue-500" />
              <div className="text-left">
                <h2 className="text-lg font-serif italic text-white">Customer Ledgers</h2>
                <p className="text-xs text-[#d1d1d1]/50">Select a customer to view their transactions, invoices, and payments</p>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d1d1d1]/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search customers by name, city or GSTIN..."
                className="w-full bg-[#1a1a1a] text-sm text-white placeholder-[#d1d1d1]/40 pl-10 pr-4 py-2.5 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <p className="text-xs text-[#d1d1d1]/40 text-center p-6">No customers found.</p>
              ) : (
                filteredCustomers.map(c => {
                  const hasOverdue = invoices.some(
                    i => i.partyId === c.id && (i.status === 'Overdue' || i.status === 'Unpaid')
                  );
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setActiveTab('ledger');
                        setIsListOpen(false); // Collapsed by default when selected
                      }}
                      className="w-full text-left px-5 py-4 rounded-xl border border-white/5 bg-[#1a1a1a]/40 hover:bg-white/5 transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-[#d1d1d1]/50 mt-0.5">{c.city} {c.phone ? `• ${c.phone}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasOverdue && (
                          <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/20">
                            Overdue
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#d1d1d1]/40" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Collapsible layout when customer is selected */
        <div className="flex gap-4 h-full relative print:hidden">
          
          {/* Collapsible Left Customer Sidebar */}
          {isListOpen && (
            <div className="w-72 flex-shrink-0 space-y-3 bg-[#0d0d0d] lg:bg-transparent border-r border-white/10 lg:border-none pr-4 lg:pr-0 print:hidden absolute lg:relative z-30 h-full lg:h-auto overflow-y-auto">
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <h2 className="text-sm font-serif italic text-white">Customer List</h2>
                  </div>
                  <button
                    onClick={() => setIsListOpen(false)}
                    className="p-1 text-[#d1d1d1]/50 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                    title="Hide List"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d1d1]/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-8 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">
                  {filteredCustomers.map(c => {
                    const isSelected = c.id === selectedCustomerId;
                    const hasOverdue = invoices.some(
                      i => i.partyId === c.id && (i.status === 'Overdue' || i.status === 'Unpaid')
                    );
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setActiveTab('ledger');
                          if (window.innerWidth < 1024) setIsListOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                          isSelected ? 'bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20' : 'text-[#d1d1d1] hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 pr-2 text-left">
                          <p className="truncate">{c.name}</p>
                          <p className="text-[9px] text-[#d1d1d1]/40 truncate mt-0.5">{c.city}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                          <ChevronRight className="w-3 h-3 opacity-45" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Ledger Detail Panel */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Customer Info Header */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => setIsListOpen(o => !o)}
                    className="mt-1 p-2 text-[#d1d1d1]/60 hover:text-white rounded-lg hover:bg-white/10 transition print:hidden cursor-pointer"
                    title="Toggle Customer List"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">Customer Account</span>
                    <h3 className="text-xl font-serif italic text-white mt-1">{selectedCustomer.name}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-[#d1d1d1]/60">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedCustomer.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedCustomer.email}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedCustomer.city}</span>
                  {selectedCustomer.gstin && (
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />GST: {selectedCustomer.gstin}</span>
                  )}
                </div>
              </div>
            </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
                <button
                  onClick={() => setShowDateFilter(f => !f)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-semibold border transition ${showDateFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#1a1a1a] text-[#d1d1d1] border-white/10 hover:border-blue-500'}`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Filter
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10 hover:border-emerald-500 hover:text-emerald-500 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
                <button
                  onClick={() => setIsOpenPrintPreview(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10 hover:border-blue-500 hover:text-blue-500 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>

            {/* Date Filter */}
            {showDateFilter && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-end gap-3 print:hidden">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="flex items-center gap-1 px-3 py-2 text-[10px] rounded-full border border-white/10 text-[#d1d1d1]/50 hover:text-white transition">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Billed',      value: totalBilled,             color: 'text-white',         border: 'border-white/10' },
              { label: 'Total Received',    value: totalPaid,               color: 'text-emerald-500',   border: 'border-emerald-500/20' },
              {
  label: outstanding >= 0 ? 'Outstanding' : 'Advance / Credit',
  value: Math.abs(outstanding),
  color:
    outstanding > 0
      ? 'text-rose-500'
      : outstanding < 0
        ? 'text-emerald-500'
        : 'text-emerald-500',
  border:
    outstanding > 0
      ? 'border-rose-500/20'
      : 'border-emerald-500/20'
},
              { label: 'Credit Limit',      value: selectedCustomer.creditLimit, color: 'text-blue-500', border: 'border-blue-500/20' },
            ].map(s => (
              <div key={s.label} className={`bg-[#141414] border ${s.border} rounded-2xl p-4`}>
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Debit',   value: totalDebit,              color: 'text-rose-500' },
              { label: 'Total Credit',  value: totalCredit,             color: 'text-emerald-500' },
              { label: 'Running Balance', value: runningBalance,        color: runningBalance > 0 ? 'text-amber-500' : 'text-emerald-500' },
            ].map(s => (
              <div key={s.label} className="bg-[#141414] border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{s.label}</p>
                <p className={`text-base font-bold ${s.color}`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/10 print:hidden">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-500 border-b-2 border-blue-500'
                        : 'text-[#d1d1d1]/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-blue-600 text-white' : 'bg-white/10 text-[#d1d1d1]/60'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Ledger Entries Tab ── */}
            {activeTab === 'ledger' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#d1d1d1]">
                  <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Voucher No</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Narration</th>
                      <th className="p-3.5 text-right">Debit</th>
                      <th className="p-3.5 text-right">Credit</th>
                      <th className="p-3.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customerLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#d1d1d1]/40">
                          No ledger entries for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerLedger.map(entry => (
                        <tr key={entry.id} className="hover:bg-white/5 transition">
                          <td className="p-3.5 whitespace-nowrap">{entry.date}</td>
                          <td className="p-3.5 font-bold text-blue-500 whitespace-nowrap">{entry.voucherNumber}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#d1d1d1]/70">
                              {entry.voucherType}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#d1d1d1]/70 max-w-[220px] truncate">{entry.narration}</td>
                          <td className="p-3.5 text-right">
                            {entry.debit > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-rose-500 font-semibold">
                                <ArrowUpRight className="w-3 h-3" />{fmt(entry.debit)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-3.5 text-right">
                            {entry.credit > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-emerald-500 font-semibold">
                                <ArrowDownLeft className="w-3 h-3" />{fmt(entry.credit)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className={`p-3.5 text-right font-bold whitespace-nowrap ${entry.runningBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {fmt(entry.runningBalance)}
                            <span className="text-[9px] font-normal text-[#d1d1d1]/40 ml-1">
                              {entry.runningBalance > 0 ? 'Dr' : 'Cr'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {customerLedger.length > 0 && (
                    <tfoot className="bg-[#1a1a1a] border-t border-white/10">
                      <tr>
                        <td colSpan={4} className="p-3.5 text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 font-bold">Totals</td>
                        <td className="p-3.5 text-right font-bold text-rose-500">{fmt(totalDebit)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-500">{fmt(totalCredit)}</td>
                        <td className={`p-3.5 text-right font-bold ${runningBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {fmt(runningBalance)}
                          <span className="text-[9px] font-normal text-[#d1d1d1]/40 ml-1">
                            {runningBalance > 0 ? 'Dr' : 'Cr'}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* ── Invoices Tab ── */}
            {activeTab === 'invoices' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#d1d1d1]">
                  <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Invoice No</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Due Date</th>
                      <th className="p-3.5 text-right">Grand Total</th>
                      <th className="p-3.5 text-right">Paid</th>
                      <th className="p-3.5 text-right">Outstanding</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customerInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#d1d1d1]/40">
                          No invoices for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerInvoices.map(inv => {
                        const paidAmount =
  invoicePaymentMap.get(
    inv.invoiceNumber.trim().toLowerCase()
  ) || 0;

const rawDue = inv.grandTotal - paidAmount;
const due = Math.max(0, rawDue);
const advance = Math.max(0, -rawDue);

const status =
  paidAmount >= inv.grandTotal
    ? 'Paid'
    : paidAmount > 0
      ? 'Partially Paid'
      : 'Unpaid';
                        return (
                          <tr key={inv.id} className="hover:bg-white/5 transition">
  <td className="p-3.5 font-bold text-blue-500">
    {inv.invoiceNumber}
  </td>

  <td className="p-3.5">
    {inv.date}
  </td>

  <td className="p-3.5">
    {inv.dueDate}
  </td>

  <td className="p-3.5 text-right font-bold text-white">
    {fmt(inv.grandTotal)}
  </td>

  <td className="p-3.5 text-right text-emerald-500 font-semibold">
    {fmt(paidAmount)}
  </td>

  <td
    className={`p-3.5 text-right font-bold ${
      due > 0
        ? 'text-rose-500'
        : 'text-emerald-500'
    }`}
  >
    {fmt(due)}
  </td>

  <td className="p-3.5">
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
        statusColors[status] ||
        'bg-white/10 text-white'
      }`}
    >
      {status}
    </span>
  </td>
</tr>
                        );
                      })
                    )}
                  </tbody>
                  {customerInvoices.length > 0 && (
                    <tfoot className="bg-[#1a1a1a] border-t border-white/10">
                      <tr>
                        <td colSpan={3} className="p-3.5 text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 font-bold">Totals</td>
                        <td className="p-3.5 text-right font-bold text-white">{fmt(totalBilled)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-500">{fmt(totalPaid)}</td>
                        <td className={`p-3.5 text-right font-bold ${outstanding > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{fmt(outstanding)}</td>
                        <td className="p-3.5"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* ── Payments Tab ── */}
            {activeTab === 'payments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#d1d1d1]">
                  <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Payment ID</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Invoice Ref</th>
                      <th className="p-3.5">Mode</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customerPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#d1d1d1]/40">
                          No payment records for this customer.
                        </td>
                      </tr>
                    ) : (
                      customerPayments.map(p => (
                        <tr key={p.id} className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-bold text-blue-500">{p.paymentNumber}</td>
                          <td className="p-3.5">{p.date}</td>
                          <td className="p-3.5 text-[#d1d1d1]/60">{p.invoiceNumber || '—'}</td>
                          <td className="p-3.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#d1d1d1]/70">
                              {p.mode}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-500">{fmt(p.amount)}</td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusColors[p.status] || 'bg-white/10 text-white'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#d1d1d1]/60 max-w-[160px] truncate">{p.remarks || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {customerPayments.length > 0 && (
                    <tfoot className="bg-[#1a1a1a] border-t border-white/10">
                      <tr>
                        <td colSpan={4} className="p-3.5 text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 font-bold">Total Received</td>
                        <td className="p-3.5 text-right font-bold text-emerald-500">
                          {fmt(customerPayments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── PRINT PREVIEW MODAL ── */}
      {isOpenPrintPreview && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 text-[#d1d1d1] flex flex-col">
            
            {/* Action Bar */}
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="bg-sky-500/15 text-sky-400 text-xs font-bold px-3 py-1 rounded-full border border-sky-500/30 uppercase tracking-wider">
                  Statement Preview
                </span>
                <span className="text-[#d1d1d1]/60 text-xs font-semibold">{selectedCustomer.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer font-sans"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setIsOpenPrintPreview(false)}
                  className="p-2 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Document Area (Displays exactly what print looks like) */}
            <div id="printable-ledger-sheet" className="bg-white text-slate-900 rounded-xl p-8 border border-slate-200 text-xs font-sans leading-normal border-t-8 border-t-sky-600 text-left relative">
              
              <table className="w-full text-left text-xs border-collapse print:bg-white print:text-black">
                <thead>
                  {/* Row 1: Letterhead */}
                  <tr>
                    <th colSpan={6} className="text-left font-normal border-none p-0 pb-4">
                      <div className="flex justify-between items-start border-b border-sky-200 pb-4">
                        <div className="flex gap-4 items-center">
                          <img
                            src="/logo.png"
                            alt="Jai Shiv Trading Logo"
                            className="w-12 h-12 object-contain rounded-lg shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="text-left">
                            <h1 className="text-lg font-black text-sky-950 tracking-wide uppercase leading-tight">
                              {company?.company_name || 'JAI SHIV TRADING'}
                            </h1>
                            <p className="text-[9px] text-slate-500 max-w-[340px] mt-0.5 leading-snug">
                              {company?.address || 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1 RAMBAGH AGRA'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-[9px] text-slate-600 space-y-0.5 font-medium">
                          {company?.phone && <p>Contact: <span className="text-slate-800 font-bold">{company.phone}</span></p>}
                          {company?.email && <p>Email: <span className="text-slate-800 font-bold">{company.email}</span></p>}
                          {company?.gst_number && <p>GSTIN: <span className="font-mono text-slate-900 font-bold">{company.gst_number}</span></p>}
                          {company?.pan && <p>PAN: <span className="font-mono text-slate-900 font-bold">{company.pan}</span></p>}
                        </div>
                      </div>
                    </th>
                  </tr>

                  {/* Row 2: Title Banner */}
                  <tr>
                    <th colSpan={6} className="text-left font-normal border-none p-0 pb-4">
                      <div className="grid grid-cols-2 border border-sky-400 bg-sky-50/70 text-[10px] p-2 rounded items-center">
                        <div className="text-sky-955 font-black text-xs uppercase tracking-wider">
                          Statement of Account
                        </div>
                        <div className="text-right text-slate-700 font-bold">
                          Period: {dateFrom ? dateFrom : 'Beginning'} to {dateTo ? dateTo : 'Present'}
                        </div>
                      </div>
                    </th>
                  </tr>

                  {/* Row 3: Customer Details & Summary Box */}
                  <tr>
                    <th colSpan={6} className="text-left font-normal border-none p-0 pb-4">
                      <div className="grid grid-cols-12 gap-6 text-xs">
                        {/* Customer Info */}
                        <div className="col-span-7 space-y-1 text-left">
                          <p className="text-[9px] font-extrabold text-sky-700 uppercase tracking-wider">Account Holder Details</p>
                          <p className="font-bold text-sm text-slate-900 text-left">{selectedCustomer.name}</p>
                          <p className="text-slate-600 text-[11px] leading-relaxed text-left">{selectedCustomer.address}</p>
                          <p className="text-slate-600 text-left">Mobile: {selectedCustomer.phone}</p>
                          {selectedCustomer.gstin && (
                            <p className="text-slate-700 text-left">
                              GSTIN: <span className="font-mono font-bold text-slate-900">{selectedCustomer.gstin}</span>
                            </p>
                          )}
                          {(selectedCustomer as any).pan && (
                            <p className="text-slate-700 text-left">
                              PAN: <span className="font-mono font-bold text-slate-900">{(selectedCustomer as any).pan}</span>
                            </p>
                          )}
                        </div>

                        {/* Account Summary */}
                        <div className="col-span-5 border border-sky-200 rounded-lg overflow-hidden bg-sky-50/20 text-left">
                          <p className="text-[9px] font-extrabold bg-sky-600 text-white uppercase tracking-wider px-3 py-1.5">
                            Account Summary (INR)
                          </p>
                          <div className="p-3 space-y-1.5 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Opening Balance:</span>
                              <span className="font-bold text-slate-800">{fmt(openingBalance)} {openingBalance > 0 ? 'Dr' : openingBalance < 0 ? 'Cr' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Total Debit (Sales):</span>
                              <span className="font-bold text-rose-600">{fmt(totalDebit)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Total Credit (Received):</span>
                              <span className="font-bold text-emerald-600">{fmt(totalCredit)}</span>
                            </div>
                            <div className="flex justify-between border-t border-sky-200 pt-2 font-bold text-xs mt-1">
                              <span className="text-slate-900">Closing Balance:</span>
                              <span className={runningBalance > 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                                {fmt(runningBalance)} {runningBalance > 0 ? 'Dr' : 'Cr'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>

                  {/* Row 4: Column Headers */}
                  <tr className="bg-sky-600 text-white font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-2.5 border border-sky-600 w-[15%]">Date</th>
                    <th className="p-2.5 border border-sky-600 w-[25%]">Voucher No</th>
                    <th className="p-2.5 border border-sky-600 w-[20%]">Voucher Type</th>
                    <th className="p-2.5 text-right border border-sky-600 w-[13%]">Debit (Dr)</th>
                    <th className="p-2.5 text-right border border-sky-600 w-[13%]">Credit (Cr)</th>
                    <th className="p-2.5 text-right border border-sky-600 w-[14%]">Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {customerLedger.length === 0 ? (
                    <tr className="border border-sky-200">
                      <td colSpan={6} className="p-6 text-center text-slate-400 bg-white">No ledger entries found.</td>
                    </tr>
                  ) : (
                    customerLedger.map((entry, index) => (
                      <tr key={entry.id} className={`border border-sky-200 border-t-0 hover:bg-sky-50/20 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-sky-50/10'}`}>
                        <td className="p-2.5 whitespace-nowrap text-slate-700 border-r border-sky-100 w-[15%]">{entry.date}</td>
                        <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap border-r border-sky-100 w-[25%]">{entry.voucherNumber}</td>
                        <td className="p-2.5 whitespace-nowrap text-slate-600 border-r border-sky-100 w-[20%]">{entry.voucherType}</td>
                        <td className="p-2.5 text-right text-rose-600 font-semibold border-r border-sky-100 w-[13%]">
                          {entry.debit > 0 ? fmt(entry.debit) : '—'}
                        </td>
                        <td className="p-2.5 text-right text-emerald-600 font-semibold border-r border-sky-100 w-[13%]">
                          {entry.credit > 0 ? fmt(entry.credit) : '—'}
                        </td>
                        <td className={`p-2.5 text-right font-bold whitespace-nowrap w-[14%] ${entry.runningBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {fmt(entry.runningBalance)} {entry.runningBalance > 0 ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Totals row */}
                  {customerLedger.length > 0 && (
                    <tr className="bg-sky-50/80 font-bold border border-sky-200 text-slate-900">
                      <td colSpan={3} className="p-2.5 text-[9px] uppercase tracking-wider text-slate-500 border-r border-sky-200 w-[60%]">Totals</td>
                      <td className="p-2.5 text-right text-rose-600 font-extrabold border-r border-sky-200 w-[13%]">{fmt(totalDebit)}</td>
                      <td className="p-2.5 text-right text-emerald-600 font-extrabold border-r border-sky-200 w-[13%]">{fmt(totalCredit)}</td>
                      <td className={`p-2.5 text-right font-extrabold w-[14%] ${runningBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {fmt(runningBalance)} {runningBalance > 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={6} className="border-none p-0 h-24">
                      {/* Spacer to prevent page content from overlapping the fixed page bottom footer */}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Fixed Footer for Printed Pages (and standard placement for Screen Preview) */}
              <div className="mt-8 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-4 space-y-1 print:fixed print:bottom-6 print:left-8 print:right-8 print:bg-white print:mt-0">
                <p>This is a computer generated document and does not require a physical signature.</p>
                <p className="font-bold uppercase tracking-widest text-sky-600">Generated by Jai Shiv Trading | Powered by Nexsham Technologies</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
