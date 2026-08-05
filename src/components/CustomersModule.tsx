import React, { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './ToastProvider';
import {
  ShoppingCart,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';
import { Party } from '../types';

interface CustomersModuleProps {
  parties: Party[];
  onAddParty: (newParty: Party) => void;
  onUpdateParty: (updatedParty: Party) => void;
  onDeleteParty: (partyId: string) => void;
  onToggleBlock: (partyId: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({
  parties,
  onAddParty,
  onUpdateParty,
  onDeleteParty,
  onToggleBlock,
  searchTerm,
  setSearchTerm
}) => {
  // UI state
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [profileParty, setProfileParty] = useState<Party | null>(null);
  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePartyId, setDeletePartyId] = useState<string | null>(null);
  // Toast hook
  const { addToast } = useToast();

  const customers = parties.filter(p => p.type === 'Customer');
  const filtered = customers.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    pan: '',
    type: 'GST' as 'GST' | 'Non-GST'
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', address: '', gstin: '', pan: '', type: 'GST' });
  };

  const openAdd = () => {
    resetForm();
    setEditingParty(null);
    setIsOpenModal(true);
  };

  const openEdit = (party: Party) => {
    setForm({
      name: party.name,
      phone: party.phone,
      email: party.email,
      address: party.address,
      gstin: party.gstin,
      pan: (party as any).pan || '',
      type: (party.gstin ? 'GST' : 'Non-GST') as any
    });
    setEditingParty(party);
    setIsOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      id: editingParty ? editingParty.id : `P-${Date.now()}`,
      name: form.name,
      code: `CUST-${Date.now()}`,
      type: 'Customer' as const,
      phone: form.phone,
      email: form.email,
      city: form.address.split(',').pop()?.trim() || '',
      state: '',
      gstin: form.gstin,
      creditLimit: 0,
      currentBalance: 0,
      address: form.address
    } as Party;
    if (editingParty) {
      onUpdateParty({ ...editingParty, ...base } as Party);
    } else {
      onAddParty(base);
    }
    setIsOpenModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-serif italic text-white">Customer Management</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#141414] border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d1d1d1]/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search customers..."
            className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-9 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#d1d1d1]">
            <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Mobile</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">City</th>
                <th className="p-3.5">GST</th>
                <th className="p-3.5">PAN</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#d1d1d1]/50">No customers found.</td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5 font-bold text-blue-500 cursor-pointer" onClick={() => setProfileParty(c)}>{c.name}</td>
                    <td className="p-3.5">{c.phone}</td>
                    <td className="p-3.5">{c.email}</td>
                    <td className="p-3.5">{c.city}</td>
                    <td className="p-3.5">{c.gstin || '—'}</td>
                    <td className="p-3.5">{c.pan || '—'}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${((c as any).isBlocked) ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                        {(c as any).isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button onClick={() => openEdit(c)} className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-blue-500 rounded-full transition border border-white/5 mr-2" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setDeletePartyId(c.id); setConfirmOpen(true); }} className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-rose-400 rounded-full transition border border-white/5 mr-2" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onToggleBlock(c.id)} className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-amber-400 rounded-full transition border border-white/5" title="Block/Unblock">
                        {((c as any).isBlocked) ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isOpenModal && (
        <>
          {/* Existing Modal */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-[#d1d1d1]">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">Customer {editingParty ? 'Edit' : 'Add'}</span>
                <h3 className="text-xl font-serif italic text-white mt-1">{editingParty ? editingParty.name : 'New Customer'}</h3>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="p-1.5 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Mobile *</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">City *</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address, ends with city" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">GST Number (optional)</label>
                  <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">PAN Number (optional)</label>
                  <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Customer Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none">
                    <option value="GST">GST</option>
                    <option value="Non-GST">Non-GST</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpenModal(false)} className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-white/10 text-[#d1d1d1] border border-white/10">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 uppercase tracking-wider">Save</button>
              </div>
            </form>
          </div>
        </div>
          </>
        )}
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        danger={true}
        onCancel={() => { setConfirmOpen(false); setDeletePartyId(null); }}
        onConfirm={() => {
          if (deletePartyId) {
            onDeleteParty(deletePartyId);
            addToast('success', 'Customer deleted');
          }
          setConfirmOpen(false);
          setDeletePartyId(null);
        }}
      />

      {/* Profile Modal */}
      {profileParty && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-[#d1d1d1]">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">Customer Profile</span>
                <h3 className="text-xl font-serif italic text-white mt-1">{profileParty.name}</h3>
                <p className="text-xs text-[#d1d1d1]/50 mt-0.5">{profileParty.address}</p>
              </div>
              <button onClick={() => setProfileParty(null)} className="p-1.5 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-500">Contact</p>
                <p>{profileParty.phone}</p>
                <p>{profileParty.email}</p>
              </div>
              <div>
                <p className="font-medium text-blue-500">Identifiers</p>
                <p>GST: {profileParty.gstin || '—'}</p>
                <p>PAN: {profileParty.pan || '—'}</p>
                <p>Type: {(profileParty as any).isBlocked ? 'Blocked' : 'Active'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
