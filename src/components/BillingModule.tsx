import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Printer,
  IndianRupee,
  X,
  History,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Invoice, Party, InvoiceItem, Payment, PaymentMode, Product } from '../types';
import { InvoicePrintModal } from './InvoicePrintModal';
import { useToast } from './ToastProvider';
import { getNextInvoiceNumber } from '../services/invoices';

interface BillingModuleProps {
  invoices: Invoice[];
  parties: Party[];
  payments?: Payment[];
  products?: Product[];
  onCreateInvoice: (newInvoice: Invoice) => Promise<void>;
  onAddPayment: (newPayment: Payment) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isOpenNewInvoiceModal: boolean;
  setIsOpenNewInvoiceModal: (open: boolean) => void;
}

export const BillingModule: React.FC<BillingModuleProps> = ({
  invoices,
  parties,
  payments = [],
  products = [],
  onCreateInvoice,
  onAddPayment,
  searchTerm,
  setSearchTerm,
  isOpenNewInvoiceModal,
  setIsOpenNewInvoiceModal
}) => {
  const { addToast } = useToast();
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] =
    useState<Invoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] =
    useState<Invoice | null>(null);
  const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] =
    useState<Invoice | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentModeInput, setPaymentModeInput] = useState<PaymentMode>('UPI');
  const [paymentDateInput, setPaymentDateInput] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentRemarksInput, setPaymentRemarksInput] = useState<string>('');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [selectedGstTypeFilter, setSelectedGstTypeFilter] = useState<string>('All');

  // Form State for New Invoice
  const [partyId, setPartyId] = useState<string>(parties[0]?.id || '');
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [isGstEnabled, setIsGstEnabled] = useState<boolean>(true);
  const [eWayBillNo, setEWayBillNo] = useState<string>('241098' + Math.floor(100000 + Math.random() * 900000));
  const [transporterName, setTransporterName] = useState<string>('V-Trans Express Logistics');
  const [lrNumber, setLrNumber] = useState<string>('VTR-' + Math.floor(10000 + Math.random() * 90000));

  const initialProd = products[0];
  const [items, setItems] = useState<
    Omit<InvoiceItem, 'id' | 'amount' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'totalAmount'>[]
  >(() => [
    {
      productId: initialProd?.id || 'PRD-001',
      description: initialProd?.name || 'Cotton 60s Compact Satin Finished Fabric',
      hsnCode: initialProd?.hsnCode || '5208',
      meters: 100,
      rate: initialProd?.sellingPrice || 165,
      gstPercent: initialProd?.gstRate || 5,
      discount: 0
    }
  ]);
const getPaymentStatus = (invoice: Invoice): Invoice['status'] => {
  const total = Number(invoice.grandTotal || 0);
  const paid = Number(invoice.paidAmount || 0);

  if (paid <= 0) {
    return 'Unpaid';
  }

  if (paid >= total) {
    return 'Paid';
  }

  return 'Partially Paid';
};
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.partyGstin.toLowerCase().includes(searchTerm.toLowerCase());

const matchesStatus =
  selectedStatusFilter === 'All' ||
  getPaymentStatus(inv) === selectedStatusFilter;

    const matchesGstType =
      selectedGstTypeFilter === 'All' ||
      (selectedGstTypeFilter === 'GST' && inv.isGstInvoice !== false) ||
      (selectedGstTypeFilter === 'Non-GST' && inv.isGstInvoice === false);

    return matchesSearch && matchesStatus && matchesGstType;
  });

const totalInvoiced = invoices.reduce(
  (acc, inv) => acc + Number(inv.grandTotal || 0),
  0
);

const totalGstCollected = invoices.reduce(
  (acc, inv) =>
    acc +
    Number(inv.cgstTotal || 0) +
    Number(inv.sgstTotal || 0) +
    Number(inv.igstTotal || 0),
  0
);

// Only actual outstanding receivables.
// Never allow an overpaid invoice to create a negative receivable.
const totalPendingReceivables = invoices.reduce(
  (acc, inv) =>
    acc +
    Math.max(
      0,
      Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0)
    ),
  0
);

// Amount received beyond the invoice value.
// This represents customer advance / credit balance.
const totalCustomerAdvance = invoices.reduce(
  (acc, inv) =>
    acc +
    Math.max(
      0,
      Number(inv.paidAmount || 0) - Number(inv.grandTotal || 0)
    ),
  0
);

const totalNonGstSales = invoices
  .filter((inv) => inv.isGstInvoice === false)
  .reduce(
    (acc, inv) => acc + Number(inv.grandTotal || 0),
    0
  );


  const handleProductSelect = (index: number, selectedProdId: string) => {
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: prod.id,
      description: prod.name,
      hsnCode: prod.hsnCode,
      rate: prod.sellingPrice,
      gstPercent: prod.gstRate
    };
    setItems(updated);
  };

  const handleAddItemRow = () => {
    const prod = products[items.length % (products.length || 1)] || products[0];
    setItems([
      ...items,
      {
        productId: prod?.id || `PRD-${Date.now()}`,
        description: prod?.name || 'Standard Catalog Product',
        hsnCode: prod?.hsnCode || '5208',
        meters: 100,
        rate: prod?.sellingPrice || 100,
        gstPercent: prod?.gstRate || 5,
        discount: 0
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Compute calculated line items with Discount and Product Catalog integration
  const computedInvoiceItems: InvoiceItem[] = items.map((item, index) => {
    const subtotal = item.meters * item.rate;
    const discountAmount = item.discount || 0;
    const amount = Math.max(0, subtotal - discountAmount); // Taxable Amount after discount
    const gstVal = isGstEnabled ? (amount * item.gstPercent) / 100 : 0;
    const cgstAmount = isInterstate ? 0 : gstVal / 2;
    const sgstAmount = isInterstate ? 0 : gstVal / 2;
    const igstAmount = isInterstate ? gstVal : 0;
    const totalAmount = amount + gstVal;

    return {
      ...item,
      id: `INV-ITM-${index + 1}`,
      amount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount
    };
  });

  const taxableValue = computedInvoiceItems.reduce((acc, i) => acc + i.amount, 0);
  const cgstTotal = computedInvoiceItems.reduce((acc, i) => acc + i.cgstAmount, 0);
  const sgstTotal = computedInvoiceItems.reduce((acc, i) => acc + i.sgstAmount, 0);
  const igstTotal = computedInvoiceItems.reduce((acc, i) => acc + i.igstAmount, 0);
  const grandTotal = taxableValue + cgstTotal + sgstTotal + igstTotal;

  const handleSubmitNewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingInvoice) return;

    const party = parties.find((p) => p.id === partyId) || parties[0];
    if (!party) {
      addToast('error', 'Add and select a customer before creating an invoice.');
      return;
    }

    // Calculate current financial year prefix (e.g. JS/26-27/)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11
    const currentYear = currentDate.getFullYear();
    const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
    const fyEnd = (fyStart + 1) % 100;
    const fyPrefix = `JS/${String(fyStart).slice(-2)}-${String(fyEnd).padStart(2, '0')}/`;

    try {
      setIsSavingInvoice(true);

      // Determine next sequential invoice number directly from Supabase DB to avoid local state collisions
      const resolvedInvoiceNumber = await getNextInvoiceNumber(fyPrefix);

      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        invoiceNumber: resolvedInvoiceNumber,
        orderNumber: `JSO-${currentYear}-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        partyId: party.id,
        partyName: party.name,
        partyGstin: party.gstin,
        partyAddress: party.address,
        partyCity: party.city,
        partyState: party.state,
        isInterstate,
        isGstInvoice: isGstEnabled,
        items: computedInvoiceItems,
        taxableValue,
        cgstTotal,
        sgstTotal,
        igstTotal,
        roundOff: 0,
        grandTotal,
        status: 'Unpaid',
        paidAmount: 0,
        eWayBillNo: isGstEnabled ? eWayBillNo : undefined,
        transporterName: isGstEnabled ? transporterName : undefined,
        lrNumber: isGstEnabled ? lrNumber : undefined
      };

      await onCreateInvoice(newInvoice);
      addToast('success', 'Invoice saved successfully.');
      setIsOpenNewInvoiceModal(false);
      setIsGstEnabled(true); // reset toggle for next invoice
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save invoice.';
      console.error('Failed to create invoice:', error);
      addToast('error', message, 7000);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      paymentNumber: `REC-${Date.now().toString().slice(-6)}`,
      partyId: selectedInvoiceForPayment.partyId,
      partyName: selectedInvoiceForPayment.partyName,
      invoiceNumber: selectedInvoiceForPayment.invoiceNumber,
      date: paymentDateInput || new Date().toISOString().split('T')[0],
      mode: paymentModeInput,
      amount: Number(paymentAmountInput),
      remarks: paymentRemarksInput || `Payment for Invoice ${selectedInvoiceForPayment.invoiceNumber}`,
      status: 'Completed'
    };
    onAddPayment(newPayment);
    setSelectedInvoiceForPayment(null);
  };

  const formatRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-serif italic text-white">Billing & Invoices</h2>
          </div>
          <p className="text-xs text-[#d1d1d1]/60 mt-1">
            Generate GST tax invoices or normal invoices with full product catalog integration
          </p>
        </div>

        <button
          onClick={() => setIsOpenNewInvoiceModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
        >
          <Receipt className="w-4 h-4" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Total Billed Volume</span>
          <p className="text-2xl font-extrabold text-white mt-1">{formatRupee(totalInvoiced)}</p>
        </div>
        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">GST Collected (Tax Liability)</span>
          <p className="text-2xl font-extrabold text-emerald-500 mt-1">{formatRupee(totalGstCollected)}</p>
        </div>
        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">Non-GST Sales</span>
          <p className="text-2xl font-extrabold text-indigo-500 mt-1">{formatRupee(totalNonGstSales)}</p>
        </div>
        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl">
  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">
    Pending Receivables
  </span>
  <p className="text-2xl font-extrabold text-rose-500 mt-1">
    {formatRupee(totalPendingReceivables)}
  </p>
</div>
      </div>

      {/* Filter & Search */}
      <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d1d1d1]/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, party, GSTIN..."
            className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-9 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Unpaid', 'Partially Paid', 'Paid'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                selectedStatusFilter === st
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                  : 'bg-[#1a1a1a] text-[#d1d1d1]/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="w-px h-5 bg-white/10 mx-1" />

          {['All', 'GST', 'Non-GST'].map((gt) => (
            <button
              key={`gst-${gt}`}
              onClick={() => setSelectedGstTypeFilter(gt)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                selectedGstTypeFilter === gt
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'bg-[#1a1a1a] text-[#d1d1d1]/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {gt === 'All' ? 'All Types' : gt}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#d1d1d1]">
            <thead className="bg-[#0a0a0a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-[0.2em] border-b border-white/10">
              <tr>
                <th className="p-4">Invoice # & Date</th>
                <th className="p-4">Party / Customer</th>
                <th className="p-4">Invoice Type</th>
                <th className="p-4">Taxable Value</th>
                <th className="p-4">GST Tax</th>
                <th className="p-4">Grand Total</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5 transition">
                  <td className="p-4 font-bold text-blue-500">
                    <div>{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-[#d1d1d1]/50 font-normal mt-0.5">{inv.date}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-white">{inv.partyName}</div>
                    <div className="text-[10px] text-[#d1d1d1]/50 mt-0.5">GSTIN: {inv.partyGstin}</div>
                  </td>
                  <td className="p-4">
                    {inv.isGstInvoice === false ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-500/15 text-slate-300 border border-slate-500/30">
                        Non-GST
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          inv.isInterstate
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {inv.isInterstate ? 'IGST (Inter)' : 'CGST+SGST (Intra)'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-white">
                    {formatRupee(inv.taxableValue)}
                  </td>
                  <td className="p-4 text-blue-500 font-medium">
                    {formatRupee(inv.cgstTotal + inv.sgstTotal + inv.igstTotal)}
                  </td>
                  <td className="p-4 font-extrabold text-white">
                    {formatRupee(inv.grandTotal)}
                  </td>
                <td className="p-4">
  {(() => {
    const paymentStatus = getPaymentStatus(inv);

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          paymentStatus === 'Paid'
            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
            : paymentStatus === 'Partially Paid'
            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
            : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
        }`}
      >
        {paymentStatus}
      </span>
    );
  })()}
</td>
                  <td className="p-4 text-right space-x-2">
                {getPaymentStatus(inv) !== 'Paid' && (
  <button
    onClick={() => {
      setSelectedInvoiceForPayment(inv);
      setPaymentAmountInput(
        Math.max(
          0,
          Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0)
        )
      );
      setPaymentModeInput('UPI');
      setPaymentDateInput(new Date().toISOString().split('T')[0]);
      setPaymentRemarksInput('');
    }}
    className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold rounded-full border border-emerald-500/30 text-[10px] uppercase tracking-wider transition"
  >
    + Record Payment
  </button>
)}
                    <button
                      onClick={() => setSelectedInvoiceForHistory(inv)}
                      className="p-2 bg-[#1a1a1a] hover:bg-white/10 text-sky-500 rounded-full transition border border-white/10"
                      title="View Payment History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedInvoiceForPrint(inv)}
                      className="p-2 bg-[#1a1a1a] hover:bg-white/10 text-blue-500 rounded-full transition border border-white/10"
                      title="View / Print Tax Invoice"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Receipt Modal */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 text-[#d1d1d1] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-serif italic text-base text-white">Record Payment Receipt</h3>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="text-[#d1d1d1]/50 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5">
                <p className="font-bold text-blue-500">{selectedInvoiceForPayment.invoiceNumber}</p>
                <p className="text-white mt-0.5">{selectedInvoiceForPayment.partyName}</p>
                <p className="text-[#d1d1d1]/50 text-[11px] mt-1">
                  Invoice Total: {formatRupee(selectedInvoiceForPayment.grandTotal)} • Paid: {formatRupee(selectedInvoiceForPayment.paidAmount)} • Outstanding: {formatRupee(selectedInvoiceForPayment.grandTotal - selectedInvoiceForPayment.paidAmount)}
                </p>
              </div>

              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">
                  Payment Received Amount (₹) *
                </label>
                <input
                  type="number"
                  value={paymentAmountInput === 0 ? '' : paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-base focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Payment Mode *</label>
                  <select
                    value={paymentModeInput}
                    onChange={(e) => setPaymentModeInput(e.target.value as PaymentMode)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={paymentDateInput}
                    onChange={(e) => setPaymentDateInput(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Remarks / Reference</label>
                <input
                  type="text"
                  value={paymentRemarksInput}
                  onChange={(e) => setPaymentRemarksInput(e.target.value)}
                  placeholder="e.g. UTR # or Cheque No."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md uppercase tracking-wider"
                >
                  Post Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {isOpenNewInvoiceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 text-[#d1d1d1] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-serif italic text-base text-white">
                {isGstEnabled ? 'Generate GST Tax Invoice' : 'Generate Normal Invoice'}
              </h3>
              <button
                onClick={() => setIsOpenNewInvoiceModal(false)}
                className="text-[#d1d1d1]/50 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Select Customer *</label>
                  <select
                    value={partyId}
                    onChange={(e) => {
                      setPartyId(e.target.value);
                      const selectedP = parties.find((p) => p.id === e.target.value);
                      if (selectedP) {
                        setIsInterstate(selectedP.state.toLowerCase() !== 'gujarat');
                      }
                    }}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    {parties
                      .filter((p) => p.type === 'Customer' && !p.isBlocked)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.state})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Invoice Type (GST Toggle)</label>
                  <button
                    type="button"
                    onClick={() => setIsGstEnabled((prev) => !prev)}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl p-2.5 border transition-all duration-200 ${
                      isGstEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}
                  >
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {isGstEnabled ? 'GST ON — Tax Invoice' : 'GST OFF — Normal Invoice'}
                    </span>
                    {isGstEnabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {isGstEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">GST Supply Type</label>
                  <select
                    value={isInterstate ? 'inter' : 'intra'}
                    onChange={(e) => setIsInterstate(e.target.value === 'inter')}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="intra">Intra-State (CGST 2.5% + SGST 2.5%)</option>
                    <option value="inter">Inter-State (IGST 12% / 5%)</option>
                  </select>
                </div>
                <div />
              </div>
              )}

              {isGstEnabled && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">E-Way Bill #</label>
                  <input
                    type="text"
                    value={eWayBillNo}
                    onChange={(e) => setEWayBillNo(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Transporter Name</label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">LR Receipt #</label>
                  <input
                    type="text"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              )}

              {/* Items Table */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-blue-500 uppercase tracking-wider">Invoice Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-[#1a1a1a] hover:bg-white/10 text-blue-500 font-semibold text-xs px-3 py-1.5 rounded-full border border-white/10 transition"
                  >
                    + Add Goods Line
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 space-y-2.5"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        {/* Select Product from Catalog */}
                        <div className="col-span-5">
                          <label className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-1">
                            Select Product *
                          </label>
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-blue-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (₹{p.sellingPrice}/{p.unit} • GST {p.gstRate}%)
                              </option>
                            ))}
                            {products.length === 0 && (
                              <option value="">{item.description}</option>
                            )}
                          </select>
                        </div>

                        {/* HSN Code (Auto) */}
                        <div className="col-span-2">
                          <label className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-1">
                            HSN Code
                          </label>
                          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-white/70 text-xs font-mono text-center">
                            {item.hsnCode || '—'}
                          </div>
                        </div>

                        {/* Selling Price (Auto) */}
                        <div className="col-span-2">
                          <label className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-1">
                            Price (₹)
                          </label>
                          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-white text-xs font-bold text-right">
                            ₹{item.rate}
                          </div>
                        </div>

                        {/* GST Rate (Auto) */}
                        <div className="col-span-2">
                          <label className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-1">
                            GST Rate
                          </label>
                          <div className={`bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs font-bold text-center ${
                            isGstEnabled ? 'text-blue-500' : 'text-slate-500 line-through'
                          }`}>
                            {isGstEnabled ? `${item.gstPercent}%` : `${item.gstPercent}% (OFF)`}
                          </div>
                        </div>

                        {/* Remove Row */}
                        <div className="col-span-1 text-right pt-3">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-rose-400 hover:text-rose-300 p-1"
                              title="Remove Item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* User Input: Quantity & Discount */}
                      <div className="grid grid-cols-12 gap-3 items-center pt-2 border-t border-white/5">
                        <div className="col-span-4">
                          <label className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-1">
                            Quantity / Meters *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.meters === 0 ? '' : item.meters}
                            onChange={(e) => handleItemChange(idx, 'meters', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-white font-bold text-xs focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>

                        <div className="col-span-4">
                          <label className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-1">
                            Discount Amount (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.discount === 0 ? '' : item.discount}
                            onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="col-span-4 text-right">
                          <span className="block text-[10px] text-[#d1d1d1]/50 uppercase tracking-wider mb-0.5">
                            {isGstEnabled ? 'Line Total (incl. GST)' : 'Line Total'}
                          </span>
                          <span className="font-extrabold text-blue-500 text-xs">
                            {formatRupee(computedInvoiceItems[idx]?.totalAmount || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1a1a] p-4 rounded-xl flex justify-between items-center text-xs border border-white/5">
                <div>
                  <p className="text-[#d1d1d1]/60">Taxable Value: {formatRupee(taxableValue)}</p>
                  {isGstEnabled && (
                    <p className="text-[#d1d1d1]/60">
                      Calculated GST Tax: {formatRupee(cgstTotal + sgstTotal + igstTotal)}
                    </p>
                  )}
                  {!isGstEnabled && (
                    <p className="text-slate-500 text-[10px] italic">GST not applicable (Normal Invoice)</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold text-blue-500">
                    {isGstEnabled ? 'Grand Total (incl. GST)' : 'Total'}: {formatRupee(grandTotal)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenNewInvoiceModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInvoice}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white uppercase tracking-wider shadow-lg shadow-blue-500/20"
                >
                  {isSavingInvoice
                    ? 'Saving...'
                    : isGstEnabled
                      ? 'Generate Tax Invoice'
                      : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {selectedInvoiceForHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-xl p-6 text-[#d1d1d1] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Payment History</span>
                <h3 className="font-serif italic text-lg text-white mt-0.5">{selectedInvoiceForHistory.invoiceNumber}</h3>
                <p className="text-xs text-[#d1d1d1]/50">{selectedInvoiceForHistory.partyName}</p>
              </div>
              <button
                onClick={() => setSelectedInvoiceForHistory(null)}
                className="text-[#d1d1d1]/50 hover:text-white p-1.5 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-[#1a1a1a] p-3.5 rounded-xl border border-white/5 text-xs">
              <div>
                <span className="text-[10px] text-[#d1d1d1]/40 uppercase tracking-widest block">Invoice Total</span>
                <span className="font-bold text-white text-sm">{formatRupee(selectedInvoiceForHistory.grandTotal)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#d1d1d1]/40 uppercase tracking-widest block">Total Paid</span>
                <span className="font-bold text-emerald-500 text-sm">{formatRupee(selectedInvoiceForHistory.paidAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#d1d1d1]/40 uppercase tracking-widest block">Outstanding</span>
                <span className={`font-bold text-sm ${(selectedInvoiceForHistory.grandTotal - selectedInvoiceForHistory.paidAmount) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {formatRupee(selectedInvoiceForHistory.grandTotal - selectedInvoiceForHistory.paidAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Linked Payment Records</h4>
              {(() => {
                const linkedPayments = payments.filter(
                  p => p.invoiceNumber && p.invoiceNumber.trim().toLowerCase() === selectedInvoiceForHistory.invoiceNumber.trim().toLowerCase()
                );
                if (linkedPayments.length === 0) {
                  return (
                    <p className="text-center text-xs text-[#d1d1d1]/30 py-6 border border-white/5 rounded-xl bg-[#1a1a1a]">
                      No payment records linked to this invoice.
                    </p>
                  );
                }
                return (
                  <div className="overflow-x-auto rounded-xl border border-white/10 max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-[#d1d1d1]">
                      <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-left">Payment #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Mode</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {linkedPayments.map(p => (
                          <tr key={p.id} className="hover:bg-white/5">
                            <td className="p-2.5 font-bold text-blue-500">{p.paymentNumber}</td>
                            <td className="p-2.5 text-center">{p.date}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-white">{p.mode}</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-500">{formatRupee(p.amount)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${p.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoiceForHistory(null)}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View Trigger */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}
    </div>
  );
};
