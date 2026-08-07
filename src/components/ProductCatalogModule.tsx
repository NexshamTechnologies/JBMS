import React, { useEffect, useState } from "react";
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './ToastProvider';
import {
  Boxes,
  Plus,
  Search,
  X,
  Edit,
  Trash2
} from 'lucide-react';
import { Product } from '../types';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} from "../services/products";
interface ProductCatalogModuleProps {
  products: Product[];
  onAddProduct: (newProduct: Product) => Promise<void>;
  onUpdateProduct: (updatedProduct: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}


export const ProductCatalogModule: React.FC<ProductCatalogModuleProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  searchTerm,
  setSearchTerm,
}) => {
  // UI state
  
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  // Toast hook
  const { addToast } = useToast();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.fabricType?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Form state
  const [form, setForm] = useState({
    name: '',
    category: '',
    fabricType: '',
    unit: '',
    hsnCode: '',
    gstRate: 0,
    sellingPrice: 0
  });

  const resetForm = () => {
    setForm({
      name: '',
      category: '',
      fabricType: '',
      unit: '',
      hsnCode: '',
      gstRate: 0,
      sellingPrice: 0
    });
  };

  const openAdd = () => {
    resetForm();
    setEditingProduct(null);
    setIsOpenModal(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      name: product.name,
      category: product.category || '',
      fabricType: product.fabricType || '',
      unit: product.unit,
      hsnCode: product.hsnCode,
      gstRate: product.gstRate,
      sellingPrice: product.sellingPrice
    });
    setEditingProduct(product);
    setIsOpenModal(true);
  };



const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const base: Product = {
    id: editingProduct ? editingProduct.id : "",
    name: form.name,
    category: form.category || undefined,
    fabricType: form.fabricType || undefined,
    unit: form.unit,
    hsnCode: form.hsnCode,
    gstRate: Number(form.gstRate),
    sellingPrice: Number(form.sellingPrice),
  };

  console.log("Submitting Product:", base);

  try {
    if (editingProduct) {
      await onUpdateProduct({ ...editingProduct, ...base });
    } else {
      await onAddProduct(base);
      setIsOpenModal(false);
    }
    console.log("Success");
    setIsOpenModal(false);
  } catch (err) {
    console.error("Submit Error:", err);
  }
};
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/10 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-serif italic text-white">Product Catalog</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
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
            placeholder="Search products..."
            className="w-full bg-[#1a1a1a] text-xs text-white placeholder-[#d1d1d1]/40 pl-9 pr-3 py-2 rounded-full border border-white/10 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#d1d1d1]">
            <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Fabric Type</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5">HSN Code</th>
                <th className="p-3.5">GST %</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#d1d1d1]/50">No products found.</td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition">
                    <td className="p-3.5 font-bold text-blue-500">{p.name}</td>
                    <td className="p-3.5">{p.category || '—'}</td>
                    <td className="p-3.5">{p.fabricType || '—'}</td>
                    <td className="p-3.5">{p.unit}</td>
                    <td className="p-3.5">{p.hsnCode}</td>
                    <td className="p-3.5">{p.gstRate}%</td>
                    <td className="p-3.5">₹{p.sellingPrice}</td>
                    <td className="p-3.5 text-right">
                      <button onClick={() => openEdit(p)} className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-blue-500 rounded-full transition border border-white/5 mr-2" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setDeleteProductId(p.id); setConfirmOpen(true); }} className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-rose-400 rounded-full transition border border-white/5 mr-2" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Delete Product"
          description="Are you sure you want to delete this product? This action cannot be undone."
          danger={true}
          onCancel={() => { setConfirmOpen(false); setDeleteProductId(null); }}
          onConfirm={() => {
            if (deleteProductId) {
              onDeleteProduct(deleteProductId);
              addToast('success', 'Product deleted');
            }
            setConfirmOpen(false);
            setDeleteProductId(null);
          }}
        />
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-[#d1d1d1]">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">
                  Product {editingProduct ? 'Edit' : 'Add'}
                </span>
                <h3 className="text-xl font-serif italic text-white mt-1">
                  {editingProduct ? editingProduct.name : 'New Product'}
                </h3>
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
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Fabric Type</label>
                  <input value={form.fabricType} onChange={e => setForm({ ...form, fabricType: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Unit *</label>
                  <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">HSN Code</label>
                  <input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">GST Rate %</label>
                  <input type="number" min="0" value={form.gstRate} onChange={e => setForm({ ...form, gstRate: Number(e.target.value) })} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[#d1d1d1] font-semibold mb-1">Selling Price *</label>
                  <input type="number" min="0" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) })} required className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-2.5 text-white focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpenModal(false)} className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-white/10 text-[#d1d1d1] border border-white/10">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 uppercase tracking-wider">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
