import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Settings,
  Building2,
  Receipt,
  Users,
  Monitor,
  Save,
  Plus,
  Edit,
  X,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Upload,
  Lock,
  ShieldCheck,
  IndianRupee
} from 'lucide-react';
import { UserRole } from '../types';
import {
  getCompanySettings,
  updateCompanySettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getSystemSettings,
  updateSystemSettings,
} from '../services/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanySettings {
  name: string;
  address: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  logoUrl: string;
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

interface InvoiceSettings {
  prefix: string;
  numberFormat: string;
  defaultGstMode: 'IGST' | 'CGST+SGST' | 'None';
  footerText: string;
}

interface SystemSettings {
  theme: 'dark' | 'light';
  currency: string;
  dateFormat: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin: string;
}

// ─── Mock initial data ────────────────────────────────────────────────────────

const INITIAL_COMPANY: CompanySettings = {
  name: 'Jai Shiv Textiles',
  address: '12/A, Ring Road, Near Textile Market, Surat, Gujarat 395002',
  gstin: '24AAAFJ1234C1Z5',
  pan: 'AAAFJ1234C',
  phone: '+91 98250 11223',
  email: 'info@jaishivtextiles.com',
  logoUrl: '',
  bankName: '',
  bankBranch: '',
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
};

const INITIAL_INVOICE: InvoiceSettings = {
  prefix: 'JS',
  numberFormat: 'JS/YY-YY/####',
  defaultGstMode: 'CGST+SGST',
  footerText: 'Thank you for your business. Goods once sold will not be taken back. Subject to Surat jurisdiction.',
};

const INITIAL_SYSTEM: SystemSettings = {
  theme: 'dark',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
};



// ─── Sub-components ───────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#d1d1d1]/50 mb-1.5">
      {label}{required && <span className="text-blue-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#d1d1d1]/30 focus:outline-none focus:border-blue-500 transition";
const selectCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition";

const roleColors: Record<UserRole, string> = {
  Owner: 'bg-blue-500/15 text-blue-500 border border-blue-500/30',
  Rahul: 'bg-purple-500/15 text-purple-500 border border-purple-500/30',
  Accountant: 'bg-sky-500/15 text-sky-500 border border-sky-500/30',
};

// ─── Main Component ───────────────────────────────────────────────────────────

type SettingsTab = 'company' | 'invoice' | 'accounts' | 'users' | 'system';

export const SettingsModule: React.FC = () => {
  const [tab, setTab] = useState<SettingsTab>('company');

  // Company states (GST vs Non-GST company profiles)
  const [gstCompany, setGstCompany] = useState<CompanySettings>({ ...INITIAL_COMPANY });
  const [nonGstCompany, setNonGstCompany] = useState<CompanySettings>({ ...INITIAL_COMPANY });
  const [companyMode, setCompanyMode] = useState<'gst' | 'nongst'>('gst');
  const [companySaved, setCompanySaved] = useState(false);

  const company = companyMode === 'gst' ? gstCompany : nonGstCompany;
  const setCompany = (updated: CompanySettings | ((prev: CompanySettings) => CompanySettings)) => {
    if (companyMode === 'gst') {
      setGstCompany(prev => typeof updated === 'function' ? (updated as Function)(prev) : updated);
    } else {
      setNonGstCompany(prev => typeof updated === 'function' ? (updated as Function)(prev) : updated);
    }
  };

  const saveCompany = async () => {
    try {
      const activeId = companyMode === 'gst' ? 1 : 2;
      const activeCompany = companyMode === 'gst' ? gstCompany : nonGstCompany;

      await updateCompanySettings(activeId, {
        company_name: activeCompany.name,
        address: activeCompany.address,
        gst_number: activeCompany.gstin,
        pan: activeCompany.pan,
        logo_url: activeCompany.logoUrl,
        invoice_prefix: invoice.prefix,
        phone: activeCompany.phone,
        email: activeCompany.email,
        bank_name: activeCompany.bankName,
        bank_branch: activeCompany.bankBranch,
        account_name: activeCompany.accountName,
        account_number: activeCompany.accountNumber,
        ifsc_code: activeCompany.ifscCode,
        upi_id: activeCompany.upiId,
      });

      setCompanySaved(true);

      setTimeout(() => {
        setCompanySaved(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save company settings:", error);
      const msg = error && typeof error === 'object' && 'message' in error
        ? String((error as any).message)
        : error instanceof Error
          ? error.message
          : JSON.stringify(error);
      alert("Failed to save company settings: " + msg);
    }
  };

  // Invoice state
  const [invoice, setInvoice] = useState<InvoiceSettings>({ ...INITIAL_INVOICE });
  const [invoiceSaved, setInvoiceSaved] = useState(false);
  const saveInvoice = async () => {
    try {
      await updateInvoiceSettings({
        prefix: invoice.prefix,
        number_format: invoice.numberFormat,
        default_gst_mode: invoice.defaultGstMode,
        footer_text: invoice.footerText,
      });

      setInvoiceSaved(true);

      setTimeout(() => {
        setInvoiceSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save invoice settings:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save invoice settings."
      );
    }
  };

  // System state
  const [system, setSystem] = useState<SystemSettings>({ ...INITIAL_SYSTEM });
  const [systemSaved, setSystemSaved] = useState(false);
  const saveSystem = async () => {
    try {
      await updateSystemSettings({
        theme: system.theme,
        currency: system.currency,
        date_format: system.dateFormat,
      });

      setSystemSaved(true);

      setTimeout(() => {
        setSystemSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save system settings:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save system settings."
      );
    }
  };

  // User management state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [pwdModal, setPwdModal] = useState<AppUser | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  const emptyUser = { name: '', email: '', password: '', role: 'Rahul' as UserRole };
  const [userForm, setUserForm] = useState({ ...emptyUser });
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUserError('');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mappedUsers: AppUser[] = (data ?? []).map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email ?? '—',
        role: profile.role as UserRole,
        isActive: profile.is_active ?? true,
        lastLogin: '—',
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);

      setUserError(
        error instanceof Error
          ? error.message
          : 'Failed to load users.'
      );
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);
  const openAddUser = () => { setUserForm({ ...emptyUser }); setEditingUser(null); setUserModal(true); };
  const openEditUser = (u: AppUser) => { setUserForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditingUser(u); setUserModal(true); };



  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUserError('');

      if (editingUser) {
        const { data, error } = await supabase.functions.invoke(
          'manage-user',
          {
            body: {
              action: 'update',
              userId: editingUser.id,
              name: userForm.name.trim(),
              role: userForm.role,
            },
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.success) {
          throw new Error(
            data?.error || 'Failed to update user.'
          );
        }

        await loadUsers();
        setUserModal(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        'create-user',
        {
          body: {
            name: userForm.name.trim(),
            email: userForm.email.trim().toLowerCase(),
            password: userForm.password,
            role: userForm.role,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error || 'Failed to create user.'
        );
      }

      await loadUsers();

      setUserModal(false);

      setUserForm({
        ...emptyUser,
      });

    } catch (error) {
      console.error('User operation failed:', error);

      setUserError(
        error instanceof Error
          ? error.message
          : 'Failed to create/update user.'
      );
    }
  };



  const toggleUserActive = async (id: string) => {
    try {
      setUserError('');

      const currentUser = users.find((u) => u.id === id);

      if (!currentUser) {
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        'manage-user',
        {
          body: {
            action: 'toggle-active',
            userId: id,
            isActive: !currentUser.isActive,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error || 'Failed to update user status.'
        );
      }

      await loadUsers();

    } catch (error) {
      console.error('Failed to update user status:', error);

      setUserError(
        error instanceof Error
          ? error.message
          : 'Failed to update user status.'
      );
    }
  };



  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();

    setPwdError('');

    if (!pwdModal) {
      return;
    }

    if (newPwd.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdError('Passwords do not match.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        'manage-user',
        {
          body: {
            action: 'reset-password',
            userId: pwdModal.id,
            password: newPwd,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(
          data?.error || 'Failed to reset password.'
        );
      }

      setPwdModal(null);
      setNewPwd('');
      setConfirmPwd('');
      setPwdError('');
    } catch (error) {
      console.error('Failed to reset password:', error);

      setPwdError(
        error instanceof Error
          ? error.message
          : 'Failed to reset password.'
      );
    }
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'invoice', label: 'Invoice', icon: Receipt },
    { id: 'accounts', label: 'Accounts', icon: IndianRupee },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'system', label: 'System', icon: Monitor },
  ];



  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);

        const [
          companyGstData,
          companyNonGstData,
          invoiceData,
          systemData,
        ] = await Promise.all([
          getCompanySettings(1),
          getCompanySettings(2),
          getInvoiceSettings(),
          getSystemSettings(),
        ]);

        // -----------------------------------------
        // Company
        // -----------------------------------------

        setGstCompany({
          name: companyGstData.company_name ?? '',
          address: companyGstData.address ?? '',
          gstin: companyGstData.gst_number ?? '',
          pan: companyGstData.pan ?? '',
          phone: companyGstData.phone ?? '',
          email: companyGstData.email ?? '',
          logoUrl: companyGstData.logo_url ?? '',
          bankName: companyGstData.bank_name ?? '',
          bankBranch: companyGstData.bank_branch ?? '',
          accountName: companyGstData.account_name ?? '',
          accountNumber: companyGstData.account_number ?? '',
          ifscCode: companyGstData.ifsc_code ?? '',
          upiId: companyGstData.upi_id ?? '',
        });

        setNonGstCompany({
          name: companyNonGstData.company_name ?? '',
          address: companyNonGstData.address ?? '',
          gstin: companyNonGstData.gst_number ?? '',
          pan: companyNonGstData.pan ?? '',
          phone: companyNonGstData.phone ?? '',
          email: companyNonGstData.email ?? '',
          logoUrl: companyNonGstData.logo_url ?? '',
          bankName: companyNonGstData.bank_name ?? '',
          bankBranch: companyNonGstData.bank_branch ?? '',
          accountName: companyNonGstData.account_name ?? '',
          accountNumber: companyNonGstData.account_number ?? '',
          ifscCode: companyNonGstData.ifsc_code ?? '',
          upiId: companyNonGstData.upi_id ?? '',
        });

        // -----------------------------------------
        // Invoice
        // -----------------------------------------

        setInvoice({
          prefix: invoiceData.prefix,
          numberFormat: invoiceData.number_format,
          defaultGstMode: invoiceData.default_gst_mode,
          footerText: invoiceData.footer_text,
        });

        // -----------------------------------------
        // System
        // -----------------------------------------

        setSystem({
          theme: systemData.theme,
          currency: systemData.currency,
          dateFormat: systemData.date_format,
        });

      } catch (error) {
        console.error("Failed to load settings:", error);
        const msg = error && typeof error === 'object' && 'message' in error
          ? String((error as any).message)
          : error instanceof Error
            ? error.message
            : JSON.stringify(error);
        alert("Failed to load settings: " + msg);
      } finally {
        setSettingsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141414] border border-white/10 p-5 rounded-2xl shadow-xl flex items-center gap-3">
        <Settings className="w-5 h-5 text-blue-500" />
        <div>
          <h2 className="text-xl font-serif italic text-white">Settings</h2>
          <p className="text-[11px] text-[#d1d1d1]/50 mt-0.5">Company · Invoice · User Management · System</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex border-b border-white/10">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest transition border-b-2 ${active ? 'text-blue-500 border-blue-500 bg-blue-500/5' : 'text-[#d1d1d1]/50 border-transparent hover:text-white hover:bg-white/5'}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════
            COMPANY SETTINGS
        ══════════════════════════════════════ */}
        {tab === 'company' && (
          <div className="p-6 space-y-5">
            {/* Toggle Button for GST vs Non-GST company profile */}
            <div className="flex items-center justify-start gap-2 bg-[#1a1a1a] p-1.5 rounded-xl border border-white/5 max-w-xs">
              <button
                onClick={() => setCompanyMode('gst')}
                className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${companyMode === 'gst' ? 'bg-blue-600 text-white shadow-lg' : 'text-[#d1d1d1]/50 hover:text-white'}`}
              >
                GST Settings
              </button>
              <button
                onClick={() => setCompanyMode('nongst')}
                className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${companyMode === 'nongst' ? 'bg-blue-600 text-white shadow-lg' : 'text-[#d1d1d1]/50 hover:text-white'}`}
              >
                Non-GST Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Company Name" required>
                <input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} className={inputCls} placeholder="Your business name" />
              </Field>
              <Field label="Phone Number">
                <input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} className={inputCls} placeholder="+91 XXXXX XXXXX" />
              </Field>
              <Field label="Email Address">
                <input type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} className={inputCls} />
              </Field>
              {companyMode === 'gst' && (
                <>
                  <Field label="GST Number">
                    <input value={company.gstin} onChange={e => setCompany({ ...company, gstin: e.target.value })} className={inputCls} placeholder="15-digit GSTIN" />
                  </Field>
                  <Field label="PAN Number">
                    <input value={company.pan} onChange={e => setCompany({ ...company, pan: e.target.value })} className={inputCls} placeholder="10-character PAN" />
                  </Field>
                </>
              )}
              <Field label="Company Logo">
                <label className="flex items-center gap-3 cursor-pointer bg-[#1a1a1a] border border-dashed border-white/20 rounded-xl px-3 py-2.5 hover:border-blue-500 transition group">
                  <Upload className="w-4 h-4 text-[#d1d1d1]/30 group-hover:text-blue-500" />
                  <span className="text-xs text-[#d1d1d1]/40 group-hover:text-[#d1d1d1]">
                    {company.logoUrl ? 'Logo uploaded ✓' : 'Upload logo (PNG/JPG)'}
                  </span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setCompany({ ...company, logoUrl: URL.createObjectURL(file) });
                    }} />
                </label>
                {company.logoUrl && (
                  <img src={company.logoUrl} alt="Logo preview" className="mt-2 h-10 object-contain rounded" />
                )}
              </Field>
              <div className="md:col-span-2">
                <Field label="Company Address">
                  <textarea value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })}
                    rows={2} className={`${inputCls} resize-none`} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={saveCompany}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition ${companySaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}>
                <Save className="w-3.5 h-3.5" />
                {companySaved ? 'Saved!' : 'Save Company Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            BANK ACCOUNT SETTINGS
        ══════════════════════════════════════ */}
        {tab === 'accounts' && (
          <div className="p-6 space-y-5">
            {/* Toggle Button for GST vs Non-GST account profile */}
            <div className="flex items-center justify-start gap-2 bg-[#1a1a1a] p-1.5 rounded-xl border border-white/5 max-w-xs">
              <button
                onClick={() => setCompanyMode('gst')}
                className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${companyMode === 'gst' ? 'bg-blue-600 text-white shadow-lg' : 'text-[#d1d1d1]/50 hover:text-white'}`}
              >
                GST Accounts
              </button>
              <button
                onClick={() => setCompanyMode('nongst')}
                className={`flex-1 text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${companyMode === 'nongst' ? 'bg-blue-600 text-white shadow-lg' : 'text-[#d1d1d1]/50 hover:text-white'}`}
              >
                Non-GST Accounts
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Bank Name">
                <input value={company.bankName || ''} onChange={e => setCompany({ ...company, bankName: e.target.value })} className={inputCls} placeholder="e.g. AXIS BANK" />
              </Field>
              <Field label="Branch Name">
                <input value={company.bankBranch || ''} onChange={e => setCompany({ ...company, bankBranch: e.target.value })} className={inputCls} placeholder="e.g. RAMBAGH, AGRA" />
              </Field>
              <Field label="Account Holder Name">
                <input value={company.accountName || ''} onChange={e => setCompany({ ...company, accountName: e.target.value })} className={inputCls} placeholder="e.g. JAI SHIV TRADING COMPANY" />
              </Field>
              <Field label="Account Number">
                <input value={company.accountNumber || ''} onChange={e => setCompany({ ...company, accountNumber: e.target.value })} className={inputCls} placeholder="e.g. 924020037111248" />
              </Field>
              <Field label="IFSC Code">
                <input value={company.ifscCode || ''} onChange={e => setCompany({ ...company, ifscCode: e.target.value })} className={inputCls} placeholder="e.g. UTIB0003333" />
              </Field>
              <Field label="UPI ID">
                <input value={company.upiId || ''} onChange={e => setCompany({ ...company, upiId: e.target.value })} className={inputCls} placeholder="e.g. 9027538830@AXISBANK" />
              </Field>
            </div>
            <div className="flex justify-end">
              <button onClick={saveCompany}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition ${companySaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}>
                <Save className="w-3.5 h-3.5" />
                {companySaved ? 'Saved!' : 'Save Account Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            INVOICE SETTINGS
        ══════════════════════════════════════ */}
        {tab === 'invoice' && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Invoice Prefix" required>
                <input value={invoice.prefix} onChange={e => setInvoice({ ...invoice, prefix: e.target.value })}
                  className={inputCls} placeholder="e.g. JS, INV, GST" />
              </Field>
              <Field label="Invoice Number Format">
                <input value={invoice.numberFormat} onChange={e => setInvoice({ ...invoice, numberFormat: e.target.value })}
                  className={inputCls} placeholder="JS/YY-YY/####" />
                <p className="mt-1 text-[10px] text-[#d1d1d1]/30">Use #### for auto-incrementing number, YY for year</p>
              </Field>
              <Field label="Default GST Mode" required>
                <select value={invoice.defaultGstMode} onChange={e => setInvoice({ ...invoice, defaultGstMode: e.target.value as InvoiceSettings['defaultGstMode'] })} className={selectCls}>
                  <option value="CGST+SGST">CGST + SGST (Intra-state)</option>
                  <option value="IGST">IGST (Inter-state)</option>
                  <option value="None">None (Non-GST)</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Invoice Footer Text">
                  <textarea value={invoice.footerText} onChange={e => setInvoice({ ...invoice, footerText: e.target.value })}
                    rows={3} className={`${inputCls} resize-none`}
                    placeholder="Terms & conditions, bank details, thank you message..." />
                </Field>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-1">
              <p className="text-[10px] text-blue-500 uppercase tracking-widest font-bold mb-2">Live Preview</p>
              <p className="text-xs text-[#d1d1d1]/70">Invoice Number: <span className="text-white font-bold">{invoice.numberFormat.replace('####', '0001').replace(/YY-YY/g, '24-25')}</span></p>
              <p className="text-xs text-[#d1d1d1]/70">GST Mode: <span className="text-white font-bold">{invoice.defaultGstMode}</span></p>
              <p className="text-xs text-[#d1d1d1]/70 mt-2 italic border-t border-white/5 pt-2">"{invoice.footerText}"</p>
            </div>

            <div className="flex justify-end">
              <button onClick={saveInvoice}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition ${invoiceSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}>
                <Save className="w-3.5 h-3.5" />
                {invoiceSaved ? 'Saved!' : 'Save Invoice Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            USER MANAGEMENT (Owner Only)
        ══════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="p-6 space-y-4">
            {userError && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <span>{userError}</span>

                <button
                  onClick={() => setUserError('')}
                  className="text-rose-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  User Accounts & Access Control
                </h3>
                <p className="text-[11px] text-[#d1d1d1]/50 mt-0.5">
                  Owner-only control panel for adding internal team accounts, assigning roles, and resetting passwords.
                </p>
              </div>
              <button onClick={openAddUser}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-full text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition">
                <Plus className="w-4 h-4" /> Create User
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs text-[#d1d1d1]">
                <thead className="bg-[#1a1a1a] text-[#d1d1d1]/50 uppercase text-[10px] tracking-widest border-b border-white/10">
                  <tr>
                    <th className="p-3.5 text-left">User</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5">Last Login</th>
                    <th className="p-3.5">Account Status</th>
                    <th className="p-3.5 text-right">Owner Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-[#d1d1d1]/40"
                      >
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-[#d1d1d1]/40"
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="p-3.5">
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[10px] text-[#d1d1d1]/40">
                            {u.email}
                          </p>
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${roleColors[u.role]}`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3.5 text-center text-[#d1d1d1]/50">
                          {u.lastLogin}
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${u.isActive
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                              }`}
                          >
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => openEditUser(u)}
                            title="Assign Role / Edit User"
                            className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-blue-500 rounded-full border border-white/5 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setPwdModal(u);
                              setNewPwd('');
                              setConfirmPwd('');
                              setPwdError('');
                            }}
                            title="Reset Password"
                            className="p-1.5 bg-[#1a1a1a] hover:bg-white/10 text-sky-500 rounded-full border border-white/5 transition"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleUserActive(u.id)}
                            title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                            className={`p-1.5 bg-[#1a1a1a] hover:bg-white/10 rounded-full border border-white/5 transition ${u.isActive ? 'text-rose-500' : 'text-emerald-500'
                              }`}
                          >
                            {u.isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            SYSTEM SETTINGS
        ══════════════════════════════════════ */}
        {tab === 'system' && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Theme">
                <select value={system.theme} onChange={e => setSystem({ ...system, theme: e.target.value as SystemSettings['theme'] })} className={selectCls}>
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light</option>
                </select>
              </Field>
              <Field label="Currency">
                <select value={system.currency} onChange={e => setSystem({ ...system, currency: e.target.value })} className={selectCls}>
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                </select>
              </Field>
              <Field label="Date Format">
                <select value={system.dateFormat} onChange={e => setSystem({ ...system, dateFormat: e.target.value })} className={selectCls}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </Field>
            </div>

            {/* Current config display */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-2">
              <p className="text-[10px] text-blue-500 uppercase tracking-widest font-bold mb-2">Active Configuration</p>
              {[
                { label: 'Theme', value: system.theme.charAt(0).toUpperCase() + system.theme.slice(1) },
                { label: 'Currency', value: system.currency },
                { label: 'Date Format', value: system.dateFormat },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-xs">
                  <span className="text-[#d1d1d1]/50">{row.label}</span>
                  <span className="font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button onClick={saveSystem}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition ${systemSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}`}>
                <Save className="w-3.5 h-3.5" />
                {systemSaved ? 'Saved!' : 'Save System Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit User Modal (Owner Only) ── */}
      {userModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-[#d1d1d1]">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-5">
              <div>

                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">{editingUser ? 'Owner Action: Edit User' : 'Owner Action: Create User'}</span>
                <h3 className="text-xl font-serif italic text-white mt-1">{editingUser ? editingUser.name : 'Create Team User'}</h3>
              </div>
              <button onClick={() => setUserModal(false)} className="p-1.5 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
              <Field label="Full Name" required>
                <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required className={inputCls} placeholder="e.g. Rahul Chauhan" />
              </Field>
              <Field label="Email Address" required>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required className={inputCls} placeholder="rahul@jaishivbms.local" />
              </Field>
              {!editingUser && (
                <Field label="Initial Password" required>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    required
                    className={inputCls}
                    placeholder="Min 6 characters"
                  />
                </Field>
              )}
              <Field label="Assign Role" required>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })} className={selectCls}>
                  <option value="Owner">Owner — Full system access</option>
                  <option value="Rahul">Rahul — Operational access (Billing, Catalog, Customers, Payments, Analytics)</option>
                  <option value="Accountant">Accountant — Billing, Payments, Customer Ledger & Reports</option>
                </select>
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setUserModal(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-white/10 text-[#d1d1d1] border border-white/10">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 uppercase tracking-wider">
                  {editingUser ? 'Update User' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset User Password Modal (Owner Only) ── */}
      {pwdModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-[#d1d1d1]">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.25em]">Owner Security Action</span>
                <h3 className="text-xl font-serif italic text-white mt-1">Reset Password</h3>
                <p className="text-[11px] text-[#d1d1d1]/40 mt-0.5">{pwdModal.name} ({pwdModal.email})</p>
              </div>
              <button onClick={() => setPwdModal(null)} className="p-1.5 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePwd} className="space-y-4 text-xs">
              <Field label="New Password" required>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    required
                    className={`${inputCls} pr-10`}
                    placeholder="Min 6 characters"
                  />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#d1d1d1]/30 hover:text-white">
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm New Password" required>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="Re-enter new password"
                />
              </Field>
              {pwdError && <p className="text-rose-400 text-[10px]">{pwdError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPwdModal(null)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a1a1a] hover:bg-white/10 text-[#d1d1d1] border border-white/10">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 uppercase tracking-wider">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
