import React, { useState, useMemo } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './ToastProvider';
import {
  CreditCard,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  Filter,
  IndianRupee
} from 'lucide-react';
import { Payment, PaymentMode, PaymentStatus, Party } from '../types';

interface PaymentsModuleProps {
  payments: Payment[];
  parties: Party[];
  onAddPayment: (payment: Payment) => void;
  onUpdatePayment: (payment: Payment) => void;
  onDeletePayment: (paymentId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'NEFT', 'RTGS', 'Cheque'];
const PAYMENT_STATUSES: PaymentStatus[] = ['Completed', 'Pending', 'Partial', 'Advance'];

const statusColors: Record<PaymentStatus, string> = {
  Completed: 'bg-emerald-500/15 text-emerald-500',
  Pending:   'bg-amber-500/15 text-amber-500',
  Partial:   'bg-blue-500/15 text-blue-500',
  Advance:   'bg-indigo-500/15 text-indigo-500',
};

const modeColors: Record<PaymentMode, string> = {
  Cash:           'bg-emerald-500/10 text-emerald-500',
  UPI:            'bg-blue-500/10 text-blue-500',
  'Bank Transfer':'bg-sky-500/10 text-sky-500',
  NEFT:           'bg-cyan-500/10 text-cyan-500',
  RTGS:           'bg-amber-500/10 text-amber-500',
  Cheque:         'bg-rose-500/10 text-rose-500',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({
  payments,
  parties,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  searchTerm,
  setSearchTerm,
}) => {
  const customers = parties.filter(p => p.type === 'Customer');

  // Filters
  const [filterMode, setFilterMode] = useState<PaymentMode | ''>('');
  const [filterParty, setFilterParty] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  // Toast hook
  const { addToast } = useToast();

  const emptyForm = {
    partyId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'UPI' as PaymentMode,
    amount: 0,
    remarks: '',
    status: 'Completed' as PaymentStatus,
  };
  const [form, setForm] = useState({ ...emptyForm });

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingPayment(null);
    setIsOpenModal(true);
  };

  const openEdit = (p: Payment) => {
    setForm({
      partyId: p.partyId,
      invoiceNumber: p.invoiceNumber || '',
      date: p.date,
      mode: p.mode,
      amount: p.amount,
      remarks: p.remarks || '',
      status: p.status,
    });
    setEditingPayment(p);
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const party = customers.find(c => c.id === form.partyId);
    const base: Payment = {
      id: editingPayment ? editingPayment.id : `PAY-${Date.now()}`,
      paymentNumber: editingPayment
        ? editingPayment.paymentNumber
        : `REC-${Date.now()}`,
      partyId: form.partyId,
      partyName: party?.name || '',
      invoiceNumber: form.invoiceNumber || undefined,
      date: form.date,
      mode: form.mode,
      amount: Number(form.amount),
      remarks: form.remarks || undefined,
      status: form.status,
    };
    if (editingPayment) {
      onUpdatePayment(base);
    } else {
      onAddPayment(base);
    }
    setIsOpenModal(false);
  };

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        p.partyName.toLowerCase().includes(q) ||
        p.paymentNumber.toLowerCase().includes(q) ||
        (p.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
        p.mode.toLowerCase().includes(q);
      const matchMode = !filterMode || p.mode === filterMode;
      const matchParty = !filterParty || p.partyId === filterParty;
      const matchFrom = !filterDateFrom || p.date >= filterDateFrom;
      const matchTo = !filterDateTo || p.date <= filterDateTo;
      return matchSearch && matchMode && matchParty && matchFrom && matchTo;
    });
  }, [payments, searchTerm, filterMode, filterParty, filterDateFrom, filterDateTo]);

  // Summary stats
  const totalCollected = payments
    .filter(p => p.status === 'Completed')
    .reduce((s, p) => s + p.amount, 0);
  const totalPending = payments
    .filter(p => p.status === 'Pending')
    .reduce((s, p) => s + p.amount, 0);
  const totalAdvance = payments
    .filter(p => p.status === 'Advance')
    .reduce((s, p) => s + p.amount, 0);
  const totalPartial = payments
    .filter(p => p.status === 'Partial')
    .reduce((s, p) => s + p.amount, 0);

  const clearFilters = () => {
    setFilterMode('');
    setFilterParty('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-serif italic text-white">Payment Management</h2>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: totalCollected, color: 'text-emerald-500', border: 'border-emerald-500/20' },
          { label: 'Pending Payments', value: totalPending, color: 'text-amber-500', border: 'border-amber-500/20' },
          { label: 'Advance Received', value: totalAdvance, color: 'text-indigo-500', border: 'border-indigo-500/20' },
          { label: 'Partial Payments', value: totalPartial, color: 'text-blue-500', border: 'border-blue-500/20' },
        ].map(card => (
          <div key={card.label} className={`bg-[#141414] border ${card.border} rounded-2xl p-4 shadow`}>
            <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d1d1d1]/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by customer, payment ID, invoice..."
              className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-9 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#1a1a1a] text-[#d1d1d1] border-white/10 hover:border-blue-500'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">Payment Mode</label>
              <select
                value={filterMode}
                onChange={e => setFilterMode(e.target.value as PaymentMode | '')}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Modes</option>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">Customer</label>
              <select
                value={filterParty}
                onChange={e => setFilterParty(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Customers</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#d1d1d1]/40 mb-1">Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button onClick={clearFilters} className="text-xs text-[#d1d1d1]/50 hover:text-white transition px-3 py-1 rounded-full border border-white/10">
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#d1d1d1]">
            <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
              <tr>
                <th className="p-3.5">Payment ID</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Invoice</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Remarks</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#d1d1d1]/40">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5 font-bold text-blue-500">{p.paymentNumber}</td>
                    <td className="p-3.5 font-semibold text-white">{p.partyName}</td>
                    <td className="p-3.5 text-[#d1d1d1]/60">{p.invoiceNumber || '—'}</td>
                    <td className="p-3.5">{p.date}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${modeColors[p.mode]}`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-white">{fmt(p.amount)}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#d1d1d1]/60 max-w-[180px] truncate">{p.remarks || '—'}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-blue-500 rounded-full transition border border-white/5 mr-2"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setDeletePaymentId(p.id); setConfirmOpen(true); }}
                        className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-rose-400 rounded-full transition border border-white/5 mr-2"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <ConfirmDialog
              isOpen={confirmOpen}
              title="Delete Payment"
              description="Are you sure you want to delete this payment? This action cannot be undone."
              danger={true}
              onCancel={() => { setConfirmOpen(false); setDeletePaymentId(null); }}
              onConfirm={() => {
                if (deletePaymentId) {
                  onDeletePayment(deletePaymentId);
                  addToast('success', 'Payment deleted');
                }
                setConfirmOpen(false);
                setDeletePaymentId(null);
              }}
            />
          </table>
        </div>
        {/* Table Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#d1d1d1]/40">
            <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            <span className="font-bold text-white">
              Total: {fmt(filtered.reduce((s, p) => s + p.amount, 0))}
            </span>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-[#d1d1d1]">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">
                  {editingPayment ? 'Edit Payment' : 'Record Payment'}
                </span>
                <h3 className="text-xl font-serif italic text-white mt-1">
                  {editingPayment ? editingPayment.paymentNumber : 'New Payment Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="p-1.5 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Customer */}
                <div className="md:col-span-2">
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Customer *</label>
                  <select
                    value={form.partyId}
                    onChange={e => setForm({ ...form, partyId: e.target.value })}
                    required
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Invoice Number (optional)</label>
                  <input
                    value={form.invoiceNumber}
                    onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                    placeholder="e.g. JS/24-25/0841"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Payment Mode *</label>
                  <select
                    value={form.mode}
                    onChange={e => setForm({ ...form, mode: e.target.value as PaymentMode })}
                    required
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Amount (₹) *</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#d1d1d1]/40" />
                    <input
                      type="number"
                      min="1"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                      required
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 pl-8 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Payment Status *</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as PaymentStatus })}
                    required
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Remarks */}
                <div className="md:col-span-2">
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Remarks</label>
                  <textarea
                    value={form.remarks}
                    onChange={e => setForm({ ...form, remarks: e.target.value })}
                    rows={3}
                    placeholder="Optional notes about this payment..."
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white resize-none focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-white/10 text-[#d1d1d1] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 uppercase tracking-wider"
                >
                  {editingPayment ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
