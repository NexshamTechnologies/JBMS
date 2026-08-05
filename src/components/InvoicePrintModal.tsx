import React from 'react';
import { Printer, X, QrCode } from 'lucide-react';
import { Invoice } from '../types';

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  onClose
}) => {
  const formatRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 text-[#d1d1d1] flex flex-col">
        {/* Action Header bar (Hidden on Print) */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/15 text-blue-500 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-wider">
              {invoice.isGstInvoice === false ? 'INVOICE PREVIEW' : 'GST TAX INVOICE PREVIEW'}
            </span>
            <span className="text-[#d1d1d1]/60 text-xs font-mono">{invoice.invoiceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
            >
              <Printer className="w-4 h-4" />
              <span>{invoice.isGstInvoice === false ? 'Print Invoice' : 'Print Tax Invoice'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Tax Invoice Container */}
        <div
          id="printable-invoice"
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg space-y-6 border border-slate-200 text-xs font-sans print:p-0 print:border-none print:shadow-none"
        >
          {/* Top Header: Company Branding & GST Title */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-black text-sm">
                  JS
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  JAI SHIV TEXTILE INDUSTRIES
                </h1>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md leading-tight">
                Plot 112-115, Millennium Textile Park-2, Ring Road, Surat, Gujarat - 395002
              </p>
              <p className="text-[11px] font-semibold text-slate-800 mt-1">
                GSTIN: <span className="font-mono text-slate-900">24AAACJ1234F1Z2</span> • State Code: 24 (Gujarat)
              </p>
              <p className="text-[10px] text-slate-500">Email: billing@jaishivtextiles.in • Mobile: +91 98250 99887</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-black bg-slate-900 text-white px-3 py-1 rounded tracking-wider uppercase inline-block">
                {invoice.isGstInvoice === false ? 'INVOICE' : 'TAX INVOICE'}
              </span>
              <p className="text-sm font-bold text-slate-900 mt-2">{invoice.invoiceNumber}</p>
              <p className="text-[11px] text-slate-600">Invoice Date: {invoice.date}</p>
              <p className="text-[11px] text-slate-600">Payment Due: {invoice.dueDate}</p>
            </div>
          </div>

          {/* Consignee & Transport Meta */}
          <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <p className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                Billed To (Buyer / Consignee):
              </p>
              <p className="font-extrabold text-sm text-slate-900 mt-0.5">{invoice.partyName}</p>
              <p className="text-slate-700 mt-0.5">{invoice.partyAddress}</p>
              <p className="text-slate-700">
                {invoice.partyCity}, {invoice.partyState}
              </p>
              <p className="font-bold text-slate-900 mt-1">
                GSTIN: <span className="font-mono">{invoice.partyGstin}</span>
              </p>
            </div>

            <div className="border-l border-slate-200 pl-4 space-y-1">
              <p className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                Dispatch & Transport Details:
              </p>
              <p className="text-slate-800">
                <strong className="text-slate-900">E-Way Bill No:</strong> {invoice.eWayBillNo || '241098230912'}
              </p>
              <p className="text-slate-800">
                <strong className="text-slate-900">Transporter:</strong> {invoice.transporterName || 'V-Trans Logistics'}
              </p>
              <p className="text-slate-800">
                <strong className="text-slate-900">Lorry Receipt (LR) #:</strong> {invoice.lrNumber || 'VTR-99021'}
              </p>
              <p className="text-slate-800">
                <strong className="text-slate-900">Supply Type:</strong>{' '}
                {invoice.isGstInvoice === false
                  ? 'Non-GST (Normal Invoice)'
                  : invoice.isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </p>
            </div>
          </div>

          {/* HSN Fabric Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 border-r border-slate-800">S.N.</th>
                  <th className="p-2.5 border-r border-slate-800">Description of Goods</th>
                  <th className="p-2.5 border-r border-slate-800">HSN Code</th>
                  <th className="p-2.5 border-r border-slate-800 text-right">Meters</th>
                  <th className="p-2.5 border-r border-slate-800 text-right">Rate/m</th>
                  <th className="p-2.5 text-right">Taxable Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900">
                      {item.description}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-mono text-slate-700">
                      {item.hsnCode}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right font-bold text-slate-900">
                      {item.meters} m
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right text-slate-800">
                      ₹{item.rate}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      {formatRupee(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* GST Tax Calculation Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-[11px] pt-2">
            {/* Bank Details & QR Code */}
            <div className="border border-slate-300 p-3 rounded-lg bg-slate-50 flex items-center gap-3 w-full sm:w-1/2">
              <div className="w-16 h-16 bg-white p-1 border border-slate-300 rounded flex items-center justify-center flex-shrink-0">
                <QrCode className="w-12 h-12 text-slate-900" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 text-xs">Bank Details for NEFT / RTGS:</p>
                <p className="text-slate-800">Bank: HDFC Bank Ltd (Ring Road Surat)</p>
                <p className="text-slate-800">
                  A/C No: <span className="font-mono font-bold">50200012345678</span>
                </p>
                <p className="text-slate-800">
                  IFSC: <span className="font-mono font-bold">HDFC0000123</span>
                </p>
                <p className="text-[10px] text-slate-500">UPI ID: jaishiv@hdfcbank</p>
              </div>
            </div>

            {/* Totals Block */}
            <div className="w-full sm:w-1/2 space-y-1 text-xs text-right border-t border-slate-200 sm:border-t-0 pt-2 sm:pt-0">
              <div className="flex justify-between text-slate-600">
                <span>Total Taxable Amount:</span>
                <span className="font-bold text-slate-900">{formatRupee(invoice.taxableValue)}</span>
              </div>

              {invoice.isGstInvoice !== false && (
                <>
                  {!invoice.isInterstate ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (2.5%):</span>
                        <span className="font-semibold text-slate-800">{formatRupee(invoice.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (2.5%):</span>
                        <span className="font-semibold text-slate-800">{formatRupee(invoice.sgstTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST (12%):</span>
                      <span className="font-semibold text-slate-800">{formatRupee(invoice.igstTotal)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t-2 border-slate-900 pt-1.5 mt-1">
                <span>{invoice.isGstInvoice === false ? 'Grand Total:' : 'Grand Total (Incl. GST):'}</span>
                <span className="text-slate-900">{formatRupee(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Authorized Signature Block */}
          <div className="border-t border-slate-300 pt-4 flex justify-between items-end text-[10px] text-slate-500">
            <div>
              <p className="font-bold text-slate-800 text-[11px] mb-1">Terms & Conditions:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Goods once sold will not be taken back without prior written consent.</li>
                <li>Interest @ 18% p.a. will be charged if payment is delayed beyond due date.</li>
                <li>Subject to Surat Jurisdiction only.</li>
              </ol>
            </div>

            <div className="text-center w-48">
              <p className="font-bold text-slate-900 text-xs mb-10">For JAI SHIV TEXTILE INDUSTRIES</p>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
