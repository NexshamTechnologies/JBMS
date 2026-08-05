import React, { useState, useMemo } from 'react';
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
  AlertCircle
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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ''
  );
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

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Filtered data for selected customer
  const customerLedger = useMemo(() => {
    let entries = ledgerEntries.filter(e => e.partyId === selectedCustomerId);
    if (dateFrom) entries = entries.filter(e => e.date >= dateFrom);
    if (dateTo) entries = entries.filter(e => e.date <= dateTo);
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [ledgerEntries, selectedCustomerId, dateFrom, dateTo]);

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
  const totalBilled = customerInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = customerInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = totalBilled - totalPaid;

  const totalDebit = customerLedger.reduce((s, e) => s + e.debit, 0);
  const totalCredit = customerLedger.reduce((s, e) => s + e.credit, 0);
  const runningBalance = customerLedger.length > 0
    ? customerLedger[customerLedger.length - 1].runningBalance
    : selectedCustomer?.currentBalance || 0;

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

  // Print ledger
  const printLedger = () => {
    window.print();
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'ledger',   label: 'Ledger',   icon: BookOpen,  count: customerLedger.length },
    { id: 'invoices', label: 'Invoices', icon: Receipt,   count: customerInvoices.length },
    { id: 'payments', label: 'Payments', icon: CreditCard, count: customerPayments.length },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ── LEFT: Customer List Panel ── */}
      <div className="lg:w-72 flex-shrink-0 space-y-3">
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-serif italic text-white">Customer Ledger</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d1d1]/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-8 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="text-xs text-[#d1d1d1]/40 text-center p-6">No customers found.</p>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = c.id === selectedCustomerId;
                const hasOverdue = invoices.some(
                  i => i.partyId === c.id && (i.status === 'Overdue' || i.status === 'Unpaid')
                );
                return (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCustomerId(c.id); setActiveTab('ledger'); }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-white/5 transition ${
                      isSelected ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-blue-500' : 'text-white'}`}>
                        {c.name}
                      </p>
                      <p className="text-[10px] text-[#d1d1d1]/50 truncate mt-0.5">{c.city}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {hasOverdue && (
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                      )}
                      {isSelected && <ChevronRight className="w-3 h-3 text-blue-500" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Ledger Detail Panel ── */}
      {selectedCustomer ? (
        <div className="flex-1 min-w-0 space-y-4">

          {/* Customer Info Header */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
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
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
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
                  onClick={printLedger}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10 hover:border-blue-500 hover:text-blue-500 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>

            {/* Date Filter */}
            {showDateFilter && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-end gap-3">
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
              { label: 'Outstanding',       value: outstanding,             color: outstanding > 0 ? 'text-rose-500' : 'text-emerald-500', border: outstanding > 0 ? 'border-rose-500/20' : 'border-emerald-500/20' },
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
            <div className="flex border-b border-white/10">
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
                        const due = inv.grandTotal - inv.paidAmount;
                        return (
                          <tr key={inv.id} className="hover:bg-white/5 transition">
                            <td className="p-3.5 font-bold text-blue-500">{inv.invoiceNumber}</td>
                            <td className="p-3.5">{inv.date}</td>
                            <td className="p-3.5">{inv.dueDate}</td>
                            <td className="p-3.5 text-right font-semibold text-white">{fmt(inv.grandTotal)}</td>
                            <td className="p-3.5 text-right text-emerald-500 font-semibold">{fmt(inv.paidAmount)}</td>
                            <td className={`p-3.5 text-right font-bold ${due > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {fmt(due)}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusColors[inv.status] || 'bg-white/10 text-white'}`}>
                                {inv.status}
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
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#d1d1d1]/40 text-sm">
          <div className="text-center space-y-2">
            <IndianRupee className="w-10 h-10 mx-auto opacity-20" />
            <p>Select a customer to view their ledger</p>
          </div>
        </div>
      )}
    </div>
  );
};
