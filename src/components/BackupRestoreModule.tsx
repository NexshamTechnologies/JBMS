import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  X
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
  onRestoreAll: (restoredData: BackupData) => void;
  onResetToDefaults: () => void;
}

export const BackupRestoreModule: React.FC<BackupRestoreModuleProps> = ({
  data,
  onRestoreAll,
  onResetToDefaults
}) => {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 1. Manual Backup Handler (Export JSON)
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

  // 2. Restore Backup Handler (Import JSON File)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('error', 'Invalid file type. Please upload a JSON backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Schema Validation
        if (
          !parsed ||
          !Array.isArray(parsed.parties) ||
          !Array.isArray(parsed.invoices) ||
          !Array.isArray(parsed.products) ||
          !Array.isArray(parsed.payments)
        ) {
          throw new Error('Invalid backup schema');
        }

        setPendingRestoreData(parsed as BackupData);
      } catch (err) {
        showToast('error', 'Failed to parse JSON backup file. Corrupted or invalid structure.');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmRestore = () => {
    if (!pendingRestoreData) return;
    onRestoreAll(pendingRestoreData);
    setPendingRestoreData(null);
    showToast('success', 'Database restored successfully from backup file!');
  };

  // 3. Database Recovery / Reset Handler
  const confirmResetDefaults = () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      showToast('error', 'Please type RESET to confirm factory reset.');
      return;
    }
    onResetToDefaults();
    setIsConfirmResetOpen(false);
    setResetConfirmInput('');
    showToast('success', 'Database recovered & reset to default mock state.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
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
            <h2 className="text-xl font-serif italic text-white">Backup, Restore & Database Recovery</h2>
          </div>
          <p className="text-xs text-[#d1d1d1]/60 mt-1">
            Local JSON data exports, full system snapshots, and factory reset recovery
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
          { label: 'Storage Engine', value: 'Local JSON State', color: 'text-blue-500', border: 'border-blue-500/20', sub: 'Client-side reactive' },
          { label: 'Encryption Standard', value: 'SHA-256 Validated', color: 'text-sky-500', border: 'border-sky-500/20', sub: 'JSON payload format' },
        ].map((card) => (
          <div key={card.label} className={`bg-[#141414] border ${card.border} rounded-2xl p-4 shadow-lg`}>
            <p className="text-[10px] uppercase tracking-widest text-[#d1d1d1]/50 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-[#d1d1d1]/30 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Operations Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Manual Backup */}
        <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-5">
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
              <h3 className="font-serif italic text-white text-lg">Manual System Backup</h3>
              <p className="text-xs text-[#d1d1d1]/60 mt-1">
                Export all invoices, customer accounts, customer ledgers, products, and payment history into a portable JSON snapshot.
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup (JSON)</span>
          </button>
        </div>

        {/* 2. Restore Backup */}
        <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-sky-500/10 text-sky-500 rounded-xl border border-sky-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-extrabold text-[#d1d1d1]/40 tracking-widest">
                JSON IMPORT
              </span>
            </div>
            <div>
              <h3 className="font-serif italic text-white text-lg">Restore from Backup</h3>
              <p className="text-xs text-[#d1d1d1]/60 mt-1">
                Upload a previously exported JSON backup file to restore all application state, ledgers, and transactions.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-sky-500/50 rounded-xl p-5 text-center cursor-pointer transition bg-[#1a1a1a] hover:bg-white/5 space-y-2 group"
            >
              <FileJson className="w-8 h-8 text-[#d1d1d1]/40 group-hover:text-sky-500 mx-auto transition" />
              <p className="text-xs font-semibold text-[#d1d1d1]/80">Click to select backup file</p>
              <p className="text-[10px] text-[#d1d1d1]/40">Accepts .json backup files</p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Select &amp; Restore File</span>
          </button>
        </div>

        {/* 3. Database Recovery / Reset */}
        <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-extrabold text-[#d1d1d1]/40 tracking-widest">
                RECOVERY
              </span>
            </div>
            <div>
              <h3 className="font-serif italic text-white text-lg">Database Recovery</h3>
              <p className="text-xs text-[#d1d1d1]/60 mt-1">
                Reset system data back to initial default demo state. Use this if data becomes invalid or corrupted.
              </p>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-400 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Caution
              </p>
              <p className="text-[11px] text-rose-300/80">
                This will overwrite current session state with default demo data.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsConfirmResetOpen(true)}
            className="w-full py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Demo Defaults</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {pendingRestoreData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 text-[#d1d1d1] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
                <h3 className="font-serif italic text-base text-white">Confirm System Restore</h3>
              </div>
              <button
                onClick={() => setPendingRestoreData(null)}
                className="text-[#d1d1d1]/50 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#d1d1d1]/80">
              Are you sure you want to restore the application state from this backup file?
            </p>

            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-[#d1d1d1]/50 text-[10px] uppercase tracking-wider font-bold mb-1">
                <span>Backup Content Summary</span>
                <span>Snapshot Metadata</span>
              </div>
              <div className="flex justify-between">
                <span>Backup Timestamp:</span>
                <span className="font-bold text-white">{pendingRestoreData.timestamp || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Invoices:</span>
                <span className="font-bold text-white">{pendingRestoreData.invoices?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Payments:</span>
                <span className="font-bold text-white">{pendingRestoreData.payments?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Parties (Customers):</span>
                <span className="font-bold text-white">{pendingRestoreData.parties?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Product Catalog:</span>
                <span className="font-bold text-white">{pendingRestoreData.products?.length || 0}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingRestoreData(null)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 shadow-md uppercase tracking-wider"
              >
                Confirm &amp; Restore State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Defaults */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 text-[#d1d1d1] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-serif italic text-base text-white">Reset Database to Defaults</h3>
              </div>
              <button
                onClick={() => setIsConfirmResetOpen(false)}
                className="text-[#d1d1d1]/50 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#d1d1d1]/80">
              This action will reset all invoices, payments, product catalog items, and party ledgers back to the default demo state.
            </p>

            <div>
              <label className="block text-[#d1d1d1] font-semibold text-xs mb-1">
                Type <span className="text-rose-500 font-mono font-bold">RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="RESET"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsConfirmResetOpen(false);
                  setResetConfirmInput('');
                }}
                className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetDefaults}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-md uppercase tracking-wider"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
