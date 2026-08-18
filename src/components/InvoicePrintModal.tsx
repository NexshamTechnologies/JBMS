import React, { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { Invoice } from '../types';
import { getCompanySettings, CompanySettingsDB } from '../services/settings';
import { supabase } from '../lib/supabase';

interface InvoicePrintModalProps {
  invoice: Invoice;
  onClose: () => void;
}

// Indian Rupee to words converter helper
function numberToIndianWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function g(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  function h(n: number): string {
    if (n >= 10000000) return h(Math.floor(n / 10000000)) + ' Crore ' + h(n % 10000000);
    if (n >= 100000) return h(Math.floor(n / 100000)) + ' Lakh ' + h(n % 100000);
    if (n >= 1000) return h(Math.floor(n / 1000)) + ' Thousand ' + h(n % 1000);
    if (n >= 100) return g(Math.floor(n / 100)) + ' Hundred ' + h(n % 100);
    return g(n);
  }

  if (num === 0) return 'Zero Rupees Only';
  
  const parts = num.toString().split('.');
  const whole = parseInt(parts[0], 10);
  const remaining = parts[1] ? parseInt(parts[1].substring(0, 2), 10) : 0;

  let res = h(whole);
  if (remaining > 0) {
    res += h(remaining);
  }

  return (res.trim() + ' Rupees Only').toUpperCase();
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  onClose
}) => {
  const [company, setCompany] = useState<CompanySettingsDB | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [logoSrc, setLogoSrc] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const companyData = await getCompanySettings(invoice.isGstInvoice ? 1 : 2);
        if (companyData) {
          setCompany(companyData);
        }
      } catch (err) {
        console.error('Failed to load company settings in print modal:', err);
      }

      try {
        const customerId = Number(invoice.partyId);
        if (Number.isInteger(customerId) && customerId > 0) {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
          if (error) throw error;
          if (data) {
            setCustomer(data);
          }
        }
      } catch (err) {
        console.error('Failed to load customer details in print modal:', err);
      }
    }

    void loadData();
  }, [invoice.partyId, invoice.isGstInvoice]);

  useEffect(() => {
    if (company?.logo_url) {
      setLogoSrc(company.logo_url);
    } else {
      setLogoSrc('/logo.png');
    }
  }, [company?.logo_url]);

  // Inject print styles directly into document.head to ensure clean evaluation in print preview
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-overrides';
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
        #printable-invoice-clone {
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
      const el = document.getElementById('dynamic-print-overrides');
      if (el) {
        document.head.removeChild(el);
      }
    };
  }, []);

  const handlePrint = () => {
    let printSection = document.getElementById('print-section');
    if (!printSection) {
      printSection = document.createElement('div');
      printSection.id = 'print-section';
      document.body.appendChild(printSection);
    }

    const invoiceEl = document.getElementById('printable-invoice');
    if (invoiceEl) {
      const clone = invoiceEl.cloneNode(true) as HTMLElement;
      clone.id = 'printable-invoice-clone';
      printSection.innerHTML = '';
      printSection.appendChild(clone);
    }

    window.print();
  };

  // Helper to format state name with its parsed GSTIN code
  const getStateNameWithCode = (gstin: string, stateName: string) => {
    if (gstin && gstin.length >= 2) {
      const code = gstin.substring(0, 2);
      if (!isNaN(parseInt(code, 10))) {
        return `${stateName || 'Uttar Pradesh'} ( ${code} )`;
      }
    }
    return stateName || 'Uttar Pradesh ( 09 )';
  };

  // Total quantity calculation
  const totalQty = invoice.items.reduce((sum, item) => sum + item.meters, 0);

  // Generate UPI QR Code Source URL
  const upiId = company?.upi_id || '9027538830@AXISBANK';
  const qrData = encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(company?.company_name || 'JAI SHIV TRADING COMPANY')}&am=${invoice.grandTotal}&cu=INR`);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:bg-white print:p-0 print:block print:overflow-visible">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 text-[#d1d1d1] flex flex-col print:bg-white print:border-none print:shadow-none print:p-0 print:w-full print:max-h-none print:text-black">
        
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{invoice.isGstInvoice === false ? 'Print Invoice' : 'Print Tax Invoice'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area - Unified High-Fidelity Design */}
        <div id="printable-invoice" className="bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 text-xs font-sans print:p-0 print:border-none print:shadow-none">

          <div className="p-6 sm:p-8 space-y-4 text-[10px] text-slate-800 leading-normal border-2 border-sky-600 rounded-lg print:border-sky-600 print:rounded-none">

            {/* Dispatch Info / Company Meta Header */}
            <div className="flex justify-between items-start border-b border-sky-300 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      onError={() => {
                        if (logoSrc !== '/logo.png') {
                          setLogoSrc('/logo.png');
                        } else {
                          setLogoSrc(''); // Trigger fallback to vector
                        }
                      }}
                      alt="Logo"
                      className="w-16 h-12 object-contain rounded"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-red-600 text-white flex flex-col items-center justify-center p-1 font-sans rounded">
                      <span className="text-[12px] font-black tracking-wider leading-none">JAI SHIV</span>
                      <span className="text-[6px] font-extrabold uppercase leading-none tracking-widest mt-1">TRADING</span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-base font-extrabold text-blue-900 leading-tight">
                      {company?.company_name || 'JAI SHIV TRADING COMPANY'}
                    </h1>
                    <p className="text-[9px] text-slate-600 font-semibold leading-tight">
                      {company?.address || 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1, RAMBAGH, AGRA, Uttar Pradesh - 282006'}
                    </p>
                  </div>
                </div>
                <div className="text-[8px] text-slate-500 pt-1 leading-tight">
                  <strong>Dispatch From :</strong> {company?.company_name || 'JAI SHIV TRADING COMPANY'}, {company?.address || 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1 RAMBAGH AGRA, Uttar Pradesh, India - 282006'} (Name : BOBI SINGH)
                </div>
              </div>

              <div className="text-right space-y-0.5 text-slate-700">
                <p className="font-bold text-slate-900">Name : BOBI SINGH</p>
                <p className="font-bold">Phone : {company?.phone || '7017508056'}</p>
              </div>
            </div>

            {/* Blue Header Banner */}
            <div className="grid grid-cols-3 border border-sky-400 bg-sky-50 text-[10px] font-bold p-1 rounded">
              <div className="text-left text-slate-700">
                {invoice.isGstInvoice ? (
                  <>GSTIN : <span className="font-mono text-slate-900">{company?.gst_number || '09CGDPS7451L1ZQ'}</span></>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
              <div className="text-center text-blue-900 font-extrabold text-sm uppercase tracking-wide">
                {invoice.isGstInvoice ? 'TAX INVOICE' : 'INVOICE'}
              </div>
              <div className="text-right text-slate-700 uppercase tracking-wider text-[8px] flex items-center justify-end">
                Original For Recipient
              </div>
            </div>

            {/* Parties Details Grid */}
            <div className="grid grid-cols-12 border border-sky-400 rounded overflow-hidden divide-x divide-sky-400 text-[10px]">
              
              {/* Buyer Column */}
              <div className="col-span-5 p-2.5 space-y-1 bg-white">
                <p className="font-extrabold text-blue-900 uppercase border-b border-sky-100 pb-0.5 text-[9px]">
                  Details of Buyer | Billed to :
                </p>
                <div className="space-y-0.5 text-slate-800">
                  <h2 className="font-black text-slate-950 uppercase text-[10.5px]">
                    {invoice.partyName}
                  </h2>
                  {customer ? (
                    <>
                      <p className="font-medium text-slate-700 leading-tight">{customer.address}</p>
                      {customer.phone && <p><strong className="text-slate-900">Mobile :</strong> <span className="font-mono font-bold text-slate-950">{customer.phone}</span></p>}
                      <p>
                        <strong className="text-slate-900">State :</strong>{' '}
                        {getStateNameWithCode(customer.gstin, customer.state || 'Uttar Pradesh')}
                      </p>
                      {invoice.isGstInvoice && customer.gstin && (
                        <p>
                          <strong className="text-slate-900">GSTIN :</strong>{' '}
                          <span className="font-mono font-bold text-blue-800 uppercase">{customer.gstin}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No customer details available</p>
                  )}
                </div>
              </div>

              {/* Consignee Column */}
              <div className="col-span-4 p-2.5 space-y-1 bg-white">
                <p className="font-extrabold text-blue-900 uppercase border-b border-sky-100 pb-0.5 text-[9px]">
                  Details of Consignee | Shipped to :
                </p>
                <div className="space-y-0.5 text-slate-800">
                  <h2 className="font-black text-slate-950 uppercase text-[10.5px]">
                    {invoice.partyName}
                  </h2>
                  {customer ? (
                    <>
                      <p className="font-medium text-slate-700 leading-tight">{customer.address}</p>
                      {customer.phone && <p><strong className="text-slate-900">Mobile :</strong> <span className="font-mono font-bold text-slate-950">{customer.phone}</span></p>}
                      <p>
                        <strong className="text-slate-900">State :</strong>{' '}
                        {getStateNameWithCode(customer.gstin, customer.state || 'Uttar Pradesh')}
                      </p>
                      {invoice.isGstInvoice && customer.gstin && (
                        <p>
                          <strong className="text-slate-900">GSTIN :</strong>{' '}
                          <span className="font-mono font-bold text-blue-800 uppercase">{customer.gstin}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No consignee details available</p>
                  )}
                </div>
              </div>

              {/* Invoice Meta Column */}
              <div className="col-span-3 p-2.5 bg-slate-50/50 space-y-1 text-[9px]">
                <p className="font-extrabold text-blue-950 uppercase border-b border-sky-200/50 pb-0.5">
                  Invoice Meta :
                </p>
                <div className="space-y-1 text-slate-700">
                  <p className="flex justify-between">
                    <span>Invoice No :</span>
                    <strong className="text-slate-950 font-mono text-[9.5px]">{invoice.invoiceNumber}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Date :</span>
                    <strong className="text-slate-950 font-mono">{new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>State Code :</span>
                    <strong className="text-slate-950 font-mono">09</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Transport :</span>
                    <strong className="text-slate-950 uppercase">{invoice.transporterName || 'SELF'}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Station :</span>
                    <strong className="text-slate-950 uppercase">{invoice.partyCity || 'AGRA'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-sky-400 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-[9.5px]">
                <thead>
                  <tr className="bg-sky-900 text-white font-extrabold text-center uppercase tracking-wider text-[8.5px]">
                    <th className="p-1.5 border-r border-sky-400 w-8">S.No.</th>
                    <th className="p-1.5 border-r border-sky-400 text-left">Description of Goods</th>
                    <th className="p-1.5 border-r border-sky-400 w-16">HSN Code</th>
                    <th className="p-1.5 border-r border-sky-400 w-16 text-right">Quantity</th>
                    <th className="p-1.5 border-r border-sky-400 w-16 text-right">Rate</th>
                    {invoice.isGstInvoice ? (
                      <>
                        <th className="p-1.5 border-r border-sky-400 w-20 text-right">Amount</th>
                        {invoice.isInterstate ? (
                          <>
                            <th className="p-1 border-r border-sky-400 w-12">IGST %</th>
                            <th className="p-1 border-r border-sky-400 w-16 text-right">IGST Amt</th>
                          </>
                        ) : (
                          <>
                            <th className="p-1 border-r border-sky-400 w-10">CGST %</th>
                            <th className="p-1 border-r border-sky-400 w-14 text-right">CGST Amt</th>
                            <th className="p-1 border-r border-sky-400 w-10">SGST %</th>
                            <th className="p-1 border-r border-sky-400 w-14 text-right">SGST Amt</th>
                          </>
                        )}
                      </>
                    ) : null}
                    <th className="p-1.5 w-24 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-300">
                  {invoice.items.map((item, idx) => {
                    const cgstRate = item.gstPercent / 2;
                    const sgstRate = item.gstPercent / 2;
                    return (
                      <tr key={idx} className="hover:bg-sky-50/50">
                        <td className="p-1.5 border-r border-sky-300 text-center font-bold">{idx + 1}</td>
                        <td className="p-1.5 border-r border-sky-300 font-semibold text-slate-900">{item.description}</td>
                        <td className="p-1.5 border-r border-sky-300 text-center font-mono text-slate-700">{item.hsnCode || '5208'}</td>
                        <td className="p-1.5 border-r border-sky-300 text-right font-bold text-slate-900">
                          {item.meters.toFixed(2)} {invoice.isGstInvoice ? '' : 'PCS'}
                        </td>
                        <td className="p-1.5 border-r border-sky-300 text-right text-slate-800">₹{item.rate.toFixed(2)}</td>
                        {invoice.isGstInvoice ? (
                          <>
                            <td className="p-1.5 border-r border-sky-300 text-right font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            {invoice.isInterstate ? (
                              <>
                                <td className="p-1 border-r border-sky-300 text-center">{item.gstPercent}%</td>
                                <td className="p-1 border-r border-sky-300 text-right">₹{item.igstAmount.toFixed(2)}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-1 border-r border-sky-300 text-center">{cgstRate}%</td>
                                <td className="p-1 border-r border-sky-300 text-right">₹{item.cgstAmount.toFixed(2)}</td>
                                <td className="p-1 border-r border-sky-300 text-center">{sgstRate}%</td>
                                <td className="p-1 border-r border-sky-300 text-right">₹{item.sgstAmount.toFixed(2)}</td>
                              </>
                            )}
                          </>
                        ) : null}
                        <td className="p-1.5 text-right font-extrabold text-slate-900">₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                  {/* Totals Row inside Table */}
                  <tr className="bg-sky-50 font-bold border-t border-sky-400 text-[10px]">
                    <td colSpan={3} className="p-1.5 border-r border-sky-400 text-right font-black uppercase text-blue-900">Total</td>
                    <td className="p-1.5 border-r border-sky-400 text-right font-black text-slate-955">
                      {totalQty.toFixed(2)} {invoice.isGstInvoice ? '' : 'PCS'}
                    </td>
                    <td className="p-1.5 border-r border-sky-400"></td>
                    {invoice.isGstInvoice ? (
                      <>
                        <td className="p-1.5 border-r border-sky-400 text-right font-black text-slate-955">₹{invoice.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        {invoice.isInterstate ? (
                          <>
                            <td className="p-1 border-r border-sky-400"></td>
                            <td className="p-1 border-r border-sky-400 text-right font-bold text-slate-955">₹{invoice.igstTotal.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-1 border-r border-sky-400"></td>
                            <td className="p-1 border-r border-sky-400 text-right font-bold text-slate-955">₹{invoice.cgstTotal.toFixed(2)}</td>
                            <td className="p-1 border-r border-sky-400"></td>
                            <td className="p-1 border-r border-sky-400 text-right font-bold text-slate-955">₹{invoice.sgstTotal.toFixed(2)}</td>
                          </>
                        )}
                      </>
                    ) : null}
                    <td className="p-1.5 text-right font-black text-blue-900">₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom calculations & Bank details */}
            <div className="grid grid-cols-12 gap-3 text-[10px] pt-1">
              
              {/* Left Section: Bank details, Terms, UPI QR */}
              <div className="col-span-7 space-y-3">
                <div>
                  <span className="font-extrabold text-blue-900 uppercase text-[9px] block mb-1">
                    {invoice.isGstInvoice ? 'Total in words' : 'Total amount (in words):'}
                  </span>
                  <p className="font-bold text-slate-900 italic text-[9.5px]">
                    {numberToIndianWords(Math.round(invoice.grandTotal))}
                  </p>
                </div>

                {/* Bank & UPI QR Grid */}
                <div className="border border-sky-300 p-2.5 rounded-lg bg-sky-50/50 grid grid-cols-10 gap-3">
                  <div className="col-span-3 flex flex-col items-center justify-center bg-white p-1 border border-sky-200 rounded">
                    <img 
                      src={qrSrc} 
                      alt="Pay using UPI"
                      className="w-16 h-16 object-contain"
                    />
                    <span className="text-[7px] text-center font-bold text-slate-500 mt-1 uppercase tracking-wider">Pay using UPI</span>
                  </div>
                  
                  <div className="col-span-7 space-y-0.5 text-[9px] text-slate-700">
                    <p className="font-extrabold text-blue-900 text-[10px] border-b border-sky-200/50 pb-0.5">Bank Details</p>
                    <p><strong className="text-slate-900">Name:</strong> {company?.bank_name || (invoice.isGstInvoice ? 'AXIS BANK' : 'RAHUL CHAUHAN')}</p>
                    <p><strong className="text-slate-900">Branch:</strong> {company?.bank_branch || (invoice.isGstInvoice ? 'TRANS YAMUNA COLONY PHASE -1' : 'GANDHI NAGAR')}</p>
                    <p><strong className="text-slate-900">Acc. Name:</strong> {company?.account_name || (invoice.isGstInvoice ? 'JAI SHIV TRADING COMPANY' : 'RAHUL CHAUHAN')}</p>
                    <p><strong className="text-slate-900">Acc. Number:</strong> <span className="font-mono font-bold text-slate-955">{company?.account_number || (invoice.isGstInvoice ? '924020037111248' : '6475108000034')}</span></p>
                    <p><strong className="text-slate-900">IFSC:</strong> <span className="font-mono font-bold text-slate-955">{company?.ifsc_code || (invoice.isGstInvoice ? 'UTIB0003333' : 'CNRB0006475')}</span></p>
                    <p><strong className="text-slate-900">UPI ID:</strong> <span className="font-mono font-bold text-blue-800">{company?.upi_id || '9027538830@AXISBANK'}</span></p>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div>
                  <span className="font-extrabold text-blue-900 uppercase text-[9px] block mb-1">
                    Terms and Conditions
                  </span>
                  <ol className="list-decimal list-inside space-y-0.5 text-[8.5px] text-slate-600 leading-tight">
                    <li>Subject to our home Jurisdiction.</li>
                    <li>Our Responsibility Ceases as soon as goods leaves our Premises.</li>
                    <li>Goods once sold will not taken back.</li>
                    <li>Delivery Ex-Premises.</li>
                  </ol>
                </div>

                {/* Customer Signature Box */}
                <div className="pt-2">
                  <div className="w-32 border-t border-slate-400 pt-1 text-[9px] text-slate-500 font-bold text-center">
                    Customer Signature
                  </div>
                </div>
              </div>

              {/* Right Section: Totals, Signatures */}
              <div className="col-span-5 flex flex-col justify-between items-end text-right pl-4">
                
                {/* Summary Totals Table */}
                <div className="w-full border border-sky-400 rounded-lg p-2.5 bg-sky-50/20 divide-y divide-sky-100 space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{invoice.isGstInvoice ? 'Taxable Amount' : 'Total'}</span>
                    <span className="font-bold text-slate-955">₹{invoice.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {invoice.isGstInvoice ? (
                    <>
                      {!invoice.isInterstate ? (
                        <>
                          <div className="flex justify-between text-slate-600 pt-1.5">
                            <span>Add : CGST</span>
                            <span className="font-bold text-slate-955">₹{invoice.cgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 pt-1">
                            <span>Add : SGST</span>
                            <span className="font-bold text-slate-955">₹{invoice.sgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-slate-600 pt-1.5">
                          <span>Add : IGST</span>
                          <span className="font-bold text-slate-955">₹{invoice.igstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600 pt-1">
                        <span>Total Tax</span>
                        <span className="font-bold text-slate-955">
                          ₹{(invoice.isInterstate ? invoice.igstTotal : (invoice.cgstTotal + invoice.sgstTotal)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-600 pt-1">
                        <span>Round off Amount</span>
                        <span className="font-bold text-slate-955">₹{invoice.roundOff.toFixed(2)}</span>
                      </div>
                    </>
                  ) : null}

                  <div className="flex justify-between text-blue-900 font-black text-sm pt-1.5 border-t border-sky-400">
                    <span>{invoice.isGstInvoice ? 'Total Amount After Tax' : 'Amount Payable'}</span>
                    <span className="text-slate-955 font-black">₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <p className="text-[8px] text-slate-400 font-bold italic pt-1">(E &amp; O.E.)</p>
                </div>

                {/* Certified Note & Authorized Signatory */}
                <div className="w-full space-y-4 pt-4 flex flex-col items-end">
                  <p className="text-[8px] text-slate-600 font-semibold italic text-center w-full">
                    Certified that the particulars given above are true and correct.
                  </p>
                  <div className="text-center w-full">
                    <p className="font-black text-slate-900 text-[10px] uppercase">
                      For {company?.company_name || 'JAI SHIV TRADING COMPANY'}
                    </p>
                    <div className="h-10"></div> {/* Signature space */}
                    <div className="w-32 border-t border-slate-400 pt-1 font-bold text-slate-500 text-[9px] mx-auto">
                      Authorised Signatory
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
          <div className="text-center text-[7.5px] text-slate-400 pb-3.5 font-bold uppercase tracking-wider print:text-slate-500">
            Powered by Nexsham Technologies
          </div>
        </div>
      </div>
    </div>
  );
};
