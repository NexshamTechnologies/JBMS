import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  X
} from 'lucide-react';
import { Party, LedgerEntry, PartyType } from '../types';

interface LedgerModuleProps {
  parties: Party[];
  ledgerEntries: LedgerEntry[];
  onAddParty: (newParty: Party) => void;
  onAddLedgerEntry: (entry: LedgerEntry) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const LedgerModule: React.FC<LedgerModuleProps> = ({
  parties,
  ledgerEntries,
  onAddParty,
  onAddLedgerEntry,
  searchTerm,
  setSearchTerm
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>(parties[0]?.id || '');
  const [isOpenPartyModal, setIsOpenPartyModal] = useState(false);
  const [isOpenVoucherModal, setIsOpenVoucherModal] = useState(false);

  // New Party Form State
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('Customer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Surat');
  const [stateName, setStateName] = useState('Gujarat');
  const [gstin, setGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(1000000);
  const [address, setAddress] = useState('');

  // Voucher Entry Form State
  const [voucherType, setVoucherType] = useState<
    'Payment Receipt' | 'Payment Made' | 'Credit Note' | 'Debit Note'
  >('Payment Receipt');
  const [voucherAmount, setVoucherAmount] = useState<number>(50000);
  const [narration, setNarration] = useState('');

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || parties[0];
  const partyLedger = ledgerEntries.filter((e) => e.partyId === selectedPartyId);

  const totalReceivable = parties
    .filter((p) => p.currentBalance > 0)
    .reduce((acc, p) => acc + p.currentBalance, 0);

  const totalPayable = parties
    .filter((p) => p.currentBalance < 0)
    .reduce((acc, p) => acc + Math.abs(p.currentBalance), 0);

  const handleCreatePartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParty: Party = {
      id: `P-${Date.now()}`,
      name: partyName,
      code: partyName.slice(0, 3).toUpperCase() + '01',
      type: partyType,
      phone,
      email,
      city,
      state: stateName,
      gstin: gstin || '24AAAAA0000A1Z5',
      creditLimit,
      currentBalance: 0,
      address
    };

    onAddParty(newParty);
    setSelectedPartyId(newParty.id);
    setIsOpenPartyModal(false);
  };

  const handleCreateVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;

    const isReceipt = voucherType === 'Payment Receipt' || voucherType === 'Credit Note';
    const debit = isReceipt ? 0 : voucherAmount;
    const credit = isReceipt ? voucherAmount : 0;

    const newEntry: LedgerEntry = {
      id: `LED-${Date.now()}`,
      partyId: selectedParty.id,
      date: new Date().toISOString().split('T')[0],
      voucherType,
      voucherNumber: `VOU-${Math.floor(1000 + Math.random() * 9000)}`,
      narration: narration || `Being ${voucherType} recorded`,
      debit,
      credit,
      runningBalance: selectedParty.currentBalance + debit - credit
    };

    onAddLedgerEntry(newEntry);
    setIsOpenVoucherModal(false);
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
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-serif italic text-white">Party Directory & Account Ledgers</h2>
          </div>
          <p className="text-xs text-[#d1d1d1]/60 mt-1">
            Manage buyer accounts, processor job work ledgers, credit limits and RTGS receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpenVoucherModal(true)}
            className="bg-[#1a1a1a] hover:bg-white/10 text-blue-500 font-semibold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-1.5 border border-white/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Post Voucher Entry</span>
          </button>
          <button
            onClick={() => setIsOpenPartyModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add New Party</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Total Outstanding Receivables (Buyers)</span>
            <p className="text-2xl font-black text-emerald-500 mt-1">{formatRupee(totalReceivable)}</p>
          </div>
          <ArrowDownLeft className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Total Outstanding Payables (Suppliers & Mills)</span>
            <p className="text-2xl font-black text-rose-500 mt-1">{formatRupee(totalPayable)}</p>
          </div>
          <ArrowUpRight className="w-8 h-8 text-rose-500/30" />
        </div>
      </div>

      {/* Grid: Parties Sidebar & Ledger Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parties Directory List (1 col) */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d1d1d1]/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search party by name, city..."
              className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-9 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {parties
              .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((party) => {
                const isSelected = party.id === selectedPartyId;

                return (
                  <button
                    key={party.id}
                    onClick={() => setSelectedPartyId(party.id)}
                    className={`w-full text-left p-3.5 rounded-xl transition border ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/50 text-white'
                        : 'bg-[#1a1a1a]/50 border-white/5 text-[#d1d1d1]/80 hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-white">{party.name}</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-[#d1d1d1]/70 font-semibold uppercase tracking-wider">
                        {party.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#d1d1d1]/50 mt-1">{party.city}, {party.state}</p>
                    <div className="mt-2 flex justify-between items-center text-[11px]">
                      <span className="text-[#d1d1d1]/50">Balance:</span>
                      <span
                        className={`font-bold ${
                          party.currentBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {formatRupee(Math.abs(party.currentBalance))}{' '}
                        {party.currentBalance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Selected Party Detailed Statement (2 cols) */}
        {selectedParty && (
          <div className="lg:col-span-2 bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            {/* Party Profile Header */}
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">
                  {selectedParty.type} Account
                </span>
                <h3 className="text-xl font-serif italic text-white mt-0.5">{selectedParty.name}</h3>
                <p className="text-[#d1d1d1]/70 mt-1">
                  {selectedParty.address}
                </p>
                <p className="text-[#d1d1d1]/50 mt-0.5 font-mono">GSTIN: {selectedParty.gstin}</p>
              </div>

              <div className="text-left md:text-right space-y-1">
                <p className="text-[#d1d1d1]/50">Current Balance:</p>
                <p className="text-xl font-black text-blue-500">
                  {formatRupee(Math.abs(selectedParty.currentBalance))}{' '}
                  {selectedParty.currentBalance >= 0 ? '(Receivable)' : '(Payable)'}
                </p>
                <p className="text-[#d1d1d1]/50">Credit Limit: {formatRupee(selectedParty.creditLimit)}</p>
              </div>
            </div>

            {/* Statement Table */}
            <div>
              <h4 className="font-bold text-xs text-white mb-2 uppercase tracking-[0.2em]">
                Account Transaction Statement
              </h4>
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-left text-xs text-[#d1d1d1]">
                  <thead className="bg-[#0a0a0a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-[0.2em]">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Voucher Type</th>
                      <th className="p-3.5">Ref #</th>
                      <th className="p-3.5">Narration</th>
                      <th className="p-3.5 text-right">Debit (Dr)</th>
                      <th className="p-3.5 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {partyLedger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#d1d1d1]/40">
                          No ledger transactions recorded for this account yet.
                        </td>
                      </tr>
                    ) : (
                      partyLedger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-medium text-[#d1d1d1]">{entry.date}</td>
                          <td className="p-3.5 font-semibold text-blue-500">{entry.voucherType}</td>
                          <td className="p-3.5 text-[#d1d1d1]/80">{entry.voucherNumber}</td>
                          <td className="p-3.5 text-[#d1d1d1]/50 text-[11px] max-w-xs truncate">
                            {entry.narration}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-500">
                            {entry.debit > 0 ? formatRupee(entry.debit) : '-'}
                          </td>
                          <td className="p-3.5 text-right font-bold text-rose-500">
                            {entry.credit > 0 ? formatRupee(entry.credit) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Party Modal */}
      {isOpenPartyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg p-6 text-[#d1d1d1] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-serif italic text-base text-white">Add New Party Account</h3>
              <button onClick={() => setIsOpenPartyModal(false)} className="text-[#d1d1d1]/50 hover:text-white p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Party Name *</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Saree Sansar, Surat"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Party Type *</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as PartyType)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Customer">Customer (Buyer)</option>
                    <option value="Dyeing Processor">Dyeing Processor</option>
                    <option value="Weaving Mill">Weaving Mill</option>
                    <option value="Yarn Supplier">Yarn Supplier</option>
                    <option value="Transporter">Transporter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="24AAACJ1234F1Z2"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Market name / shop number"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenPartyModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 uppercase tracking-wider shadow-lg shadow-blue-500/20"
                >
                  Save Party Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Entry Modal */}
      {isOpenVoucherModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 text-[#d1d1d1] space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-serif italic text-base text-white">Post Ledger Voucher Entry</h3>
              <button onClick={() => setIsOpenVoucherModal(false)} className="text-[#d1d1d1]/50 hover:text-white p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucherSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Target Party Account *</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Voucher Type *</label>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value as any)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Payment Receipt">Payment Receipt (RTGS / Cash In)</option>
                  <option value="Payment Made">Payment Made (Supplier Cash Out)</option>
                  <option value="Credit Note">Credit Note</option>
                  <option value="Debit Note">Debit Note</option>
                </select>
              </div>

              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  value={voucherAmount === 0 ? '' : voucherAmount}
                  onChange={(e) => setVoucherAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-base focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[#d1d1d1] font-semibold mb-1">Narration / Reference</label>
                <input
                  type="text"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="e.g. HDFC Bank RTGS Ref #HDFC0012398"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenVoucherModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] text-[#d1d1d1] border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 uppercase tracking-wider shadow-lg shadow-blue-500/20"
                >
                  Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
