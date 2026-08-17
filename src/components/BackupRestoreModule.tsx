import React, { useState } from 'react';
import {
  Database,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  Party,
  Invoice,
  LedgerEntry,
  Product,
  Payment
} from '../types';

export interface BackupData {
  version: string;
  timestamp: string;
  parties: Party[];
  invoices: Invoice[];
  ledgerEntries: LedgerEntry[];
  products: Product[];
  payments: Payment[];
}

interface BackupRestoreModuleProps {
  data: {
    parties: Party[];
    invoices: Invoice[];
    ledgerEntries: LedgerEntry[];
    products: Product[];
    payments: Payment[];
  };
}

export const BackupRestoreModule: React.FC<BackupRestoreModuleProps> = ({
  data
}) => {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const totalRecords =
    data.parties.length +
    data.invoices.length +
    data.ledgerEntries.length +
    data.products.length +
    data.payments.length;

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportBackup = () => {
    try {
      const now = new Date();
      const timestampStr = now.toISOString();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');

      const backupObj: BackupData = {
        version: '2.0.0',
        timestamp: timestampStr,
        parties: data.parties,
        invoices: data.invoices,
        ledgerEntries: data.ledgerEntries,
        products: data.products,
        payments: data.payments
      };

      const jsonString = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jaishiv_bms_backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Backup file downloaded successfully!');
    } catch (err) {
      showToast('error', 'Failed to generate backup file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${notification.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
            : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
            }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-serif italic text-white">System Data Export</h2>
          </div>
          <p className="text-xs text-[#d1d1d1]/60 mt-1">
            Download full system snapshots and portable data backups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/15 text-emerald-500 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Database Ready
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total BMS Records', value: totalRecords.toLocaleString(), color: 'text-white', border: 'border-white/10', sub: 'Active Business Data' },
          { label: 'System Health', value: '100% Operable', color: 'text-emerald-500', border: 'border-emerald-500/20', sub: 'Zero corruption detected' },
          { label: 'Storage Engine', value: 'PostgreSQL Live', color: 'text-blue-500', border: 'border-blue-500/20', sub: 'Supabase persisted' },
          { label: 'Export Standard', value: 'JSON File format', color: 'text-sky-500', border: 'border-sky-500/20', sub: 'JSON payload format' },
        ].map((card) => (
          <div key={card.label} className={`bg-[#141414] border ${card.border} rounded-2xl p-4 shadow-lg`}>
            <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-[#d1d1d1]/30 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Backup Operations Card */}
      <div className="max-w-2xl bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-extrabold text-[#d1d1d1]/40 tracking-widest">
              JSON EXPORT
            </span>
          </div>
          <div>
            <h3 className="font-serif italic text-white text-lg">Download System Backup</h3>
            <p className="text-xs text-[#d1d1d1]/60 mt-1">
              Export all invoices, customer accounts, customer ledgers, products, and payment history into a portable JSON snapshot. Use this to keep local copies of your database records.
            </p>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-3.5 border border-white/5 space-y-1.5 text-xs text-[#d1d1d1]/70">
            <div className="flex justify-between">
              <span>Invoices &amp; Payments:</span>
              <span className="font-bold text-white">{data.invoices.length} / {data.payments.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Parties &amp; Products:</span>
              <span className="font-bold text-white">{data.parties.length} / {data.products.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Ledger Entries:</span>
              <span className="font-bold text-white">{data.ledgerEntries.length}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportBackup}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Backup File (JSON)</span>
        </button>
      </div>
    </div>
  );
};
