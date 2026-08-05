import React from 'react';
import {
  IndianRupee,
  Boxes,
  Users,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
  Receipt
} from 'lucide-react';
import { Party, Invoice, Payment, Product } from '../types';

interface DashboardProps {
  invoices: Invoice[];
  parties: Party[];
  payments: Payment[];
  products: Product[];
  onNavigate: (tab: string) => void;
  onOpenNewInvoice: () => void;
  onOpenAI?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  parties,
  payments,
  products,
  onNavigate
}) => {
  const customers = parties.filter((p) => p.type === 'Customer');

  // Calculations
  const totalInvoicedValue = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalCollections = payments
    .filter((p) => p.status === 'Completed' || p.status === 'Partial' || p.status === 'Advance')
    .reduce((acc, p) => acc + p.amount, 0);
  const unpaidInvoicesValue = invoices
    .filter((inv) => inv.status !== 'Paid')
    .reduce((acc, inv) => acc + (inv.grandTotal - inv.paidAmount), 0);

  const formatRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced Sales */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1d1d1]/50">Total Invoiced Sales</span>
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-500 border border-blue-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{formatRupee(totalInvoicedValue)}</p>
          <p className="text-[10px] text-[#d1d1d1]/40 mt-1">{invoices.length} Invoices Generated</p>
        </div>

        {/* Total Collections */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1d1d1]/50">Total Collections</span>
            <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-emerald-500 tracking-tight">{formatRupee(totalCollections)}</p>
          <p className="text-[10px] text-[#d1d1d1]/40 mt-1">{payments.length} Payments Recorded</p>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1d1d1]/50">Customer Outstanding</span>
            <div className="p-2 bg-rose-500/10 rounded-full text-rose-500 border border-rose-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-rose-500 tracking-tight">{formatRupee(unpaidInvoicesValue)}</p>
          <p className="text-[10px] text-[#d1d1d1]/40 mt-1">Pending Customer Receivables</p>
        </div>

        {/* Active Products */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d1d1d1]/50">Active Products</span>
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-500 border border-blue-500/20">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-blue-500 tracking-tight">{products.length}</p>
          <p className="text-[10px] text-[#d1d1d1]/40 mt-1">Products Registered in Catalog</p>
        </div>
      </div>

      {/* Grid: Recent Invoices & Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tax Invoices (2 cols) */}
        <div className="lg:col-span-2 bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-500 block mb-0.5">Billing Activity</span>
              <h3 className="text-lg font-serif italic text-white">Recent Tax Invoices</h3>
            </div>
            <button
              onClick={() => onNavigate('billing')}
              className="text-[11px] uppercase tracking-wider text-blue-500 hover:text-white font-bold flex items-center gap-1 border border-blue-500/30 px-3 py-1.5 rounded-full hover:bg-blue-500/10 transition"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full text-left text-xs text-[#d1d1d1]">
              <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#d1d1d1]/30">No invoices generated yet.</td>
                  </tr>
                ) : (
                  invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition">
                      <td className="p-3.5 font-bold text-blue-500">{inv.invoiceNumber}</td>
                      <td className="p-3.5 font-semibold text-white">{inv.partyName}</td>
                      <td className="p-3.5 text-[#d1d1d1]/70">{inv.date}</td>
                      <td className="p-3.5 text-right font-extrabold text-white">{formatRupee(inv.grandTotal)}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : inv.status === 'Partially Paid'
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Directory & Shortcuts (1 col) */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-500 block mb-0.5">Quick Directory</span>
            <h3 className="text-lg font-serif italic text-white">System Modules</h3>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Customers', count: `${customers.length} Accounts`, tab: 'customers', icon: Users, color: 'text-sky-500' },
              { label: 'Product Catalog', count: `${products.length} Products`, tab: 'product-catalog', icon: Boxes, color: 'text-blue-500' },
              { label: 'Payment Records', count: `${payments.length} Records`, tab: 'payments', icon: CreditCard, color: 'text-emerald-500' },
              { label: 'Customer Ledger', count: 'Ledger Summaries', tab: 'customer-ledger', icon: Receipt, color: 'text-indigo-500' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.tab}
                  onClick={() => onNavigate(item.tab)}
                  className="p-3.5 rounded-xl bg-[#1a1a1a] border border-white/5 flex items-center justify-between gap-2 text-xs hover:border-white/20 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="font-semibold text-white group-hover:text-blue-500 transition">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-[#d1d1d1]/50 font-mono">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
