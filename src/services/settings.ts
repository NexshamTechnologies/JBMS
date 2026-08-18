import { supabase } from "../lib/supabase";

// ============================================================
// Types
// ============================================================

export interface CompanySettingsDB {
  id: number;
  company_name: string;
  address: string | null;
  gst_number: string | null;
  pan: string | null;
  logo_url: string | null;
  invoice_prefix: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  account_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  updated_at: string;
}

export interface InvoiceSettingsDB {
  id: number;
  prefix: string;
  number_format: string;
  default_gst_mode: "IGST" | "CGST+SGST" | "None";
  footer_text: string;
  updated_at: string;
}

export interface SystemSettingsDB {
  id: number;
  theme: "dark" | "light";
  currency: string;
  date_format: string;
  updated_at: string;
}

// Helper to parse dual-profile JSON stored in database fields
function parseDualField(val: string | null, fallbackGst: string, fallbackNonGst: string) {
  if (!val) return { gst: fallbackGst, nongst: fallbackNonGst };
  const trimmed = val.trim();
  try {
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      return {
        gst: parsed.gst ?? fallbackGst,
        nongst: parsed.nongst ?? fallbackNonGst
      };
    }
  } catch (e) {}
  // If not JSON, it's the legacy single value, so use it for GST and fallback for Non-GST
  return { gst: val, nongst: fallbackNonGst };
}

// Helper to serialize dual-profile values into a JSON string
function serializeDualField(gstVal: string, nonGstVal: string): string {
  return JSON.stringify({ gst: gstVal, nongst: nonGstVal });
}

// ============================================================
// COMPANY SETTINGS
// ============================================================

export const getCompanySettings = async (id: number = 1): Promise<CompanySettingsDB> => {
  // Always query row 1 from the database (since RLS only allows update of row 1 and prohibits inserts)
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Fallback defaults in case row 1 does not exist in DB (should already exist)
  const defaultRow: CompanySettingsDB = {
    id: 1,
    company_name: 'JAI SHIV TRADING COMPANY',
    address: 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1, RAMBAGH, AGRA, Uttar Pradesh - 282006',
    gst_number: '09CGDPS7451L1ZQ',
    pan: 'CGDPS7451L',
    logo_url: '',
    phone: '7017508056',
    email: 'jaishivtradingco@gmail.com',
    invoice_prefix: 'JS',
    bank_name: '',
    bank_branch: '',
    account_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    updated_at: new Date().toISOString(),
  };

  const dbRow = data || defaultRow;

  // Parse dual-encoded fields (fallbacks are mapped to your original document templates)
  const names = parseDualField(dbRow.company_name, 'JAI SHIV TRADING COMPANY', 'JAI SHIV TRADING COMPANY');
  const addresses = parseDualField(dbRow.address, 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1, RAMBAGH, AGRA, Uttar Pradesh - 282006', 'Multani Mohalla GANDHI NAGAR, Delhi East, DELHI- 110031');
  const phones = parseDualField(dbRow.phone, '7017508056', '+91 7017508056');
  const emails = parseDualField(dbRow.email, 'jaishivtradingco@gmail.com', 'jaishivtradingco@gmail.com');
  const logos = parseDualField(dbRow.logo_url, '', '');
  const bankNames = parseDualField(dbRow.bank_name, 'AXIS BANK', 'RAHUL CHAUHAN');
  const bankBranches = parseDualField(dbRow.bank_branch, 'TRANS YAMUNA COLONY PHASE -1', 'GANDHI NAGAR');
  const accountNames = parseDualField(dbRow.account_name, 'JAI SHIV TRADING COMPANY', 'RAHUL CHAUHAN');
  const accountNumbers = parseDualField(dbRow.account_number, '924020037111248', '6475108000034');
  const ifscCodes = parseDualField(dbRow.ifsc_code, 'UTIB0003333', 'CNRB0006475');
  const upiIds = parseDualField(dbRow.upi_id, '9027538830@AXISBANK', '9027538830@AXISBANK');

  if (id === 1) {
    // Return GST profile
    return {
      id: 1,
      company_name: names.gst,
      address: addresses.gst,
      gst_number: dbRow.gst_number,
      pan: dbRow.pan,
      logo_url: logos.gst,
      phone: phones.gst,
      email: emails.gst,
      bank_name: bankNames.gst,
      bank_branch: bankBranches.gst,
      account_name: accountNames.gst,
      account_number: accountNumbers.gst,
      ifsc_code: ifscCodes.gst,
      upi_id: upiIds.gst,
      invoice_prefix: dbRow.invoice_prefix,
      updated_at: dbRow.updated_at,
    };
  } else {
    // Return Non-GST profile (empty GST/PAN)
    return {
      id: 2,
      company_name: names.nongst,
      address: addresses.nongst,
      gst_number: '',
      pan: '',
      logo_url: logos.nongst,
      phone: phones.nongst,
      email: emails.nongst,
      bank_name: bankNames.nongst,
      bank_branch: bankBranches.nongst,
      account_name: accountNames.nongst,
      account_number: accountNumbers.nongst,
      ifsc_code: ifscCodes.nongst,
      upi_id: upiIds.nongst,
      invoice_prefix: dbRow.invoice_prefix,
      updated_at: dbRow.updated_at,
    };
  }
};

export const updateCompanySettings = async (
  id: number,
  settings: Omit<CompanySettingsDB, "id" | "updated_at">
): Promise<CompanySettingsDB> => {
  // 1. Fetch current row 1 to get existing values for merging
  const { data: current, error: getError } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (getError) {
    throw getError;
  }

  const defaultRow: CompanySettingsDB = {
    id: 1,
    company_name: 'JAI SHIV TRADING COMPANY',
    address: 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1, RAMBAGH, AGRA, Uttar Pradesh - 282006',
    gst_number: '09CGDPS7451L1ZQ',
    pan: 'CGDPS7451L',
    logo_url: '',
    phone: '7017508056',
    email: 'jaishivtradingco@gmail.com',
    bank_name: '',
    bank_branch: '',
    account_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    invoice_prefix: 'JS',
    updated_at: new Date().toISOString(),
  };

  const dbRow = current || defaultRow;

  // 2. Parse current values
  const names = parseDualField(dbRow.company_name, 'JAI SHIV TRADING COMPANY', 'JAI SHIV TRADING COMPANY');
  const addresses = parseDualField(dbRow.address, 'EWS NO. B-595, TRANS YAMUNA COLONY PHASE-1, RAMBAGH, AGRA, Uttar Pradesh - 282006', 'Multani Mohalla GANDHI NAGAR, Delhi East, DELHI- 110031');
  const phones = parseDualField(dbRow.phone, '7017508056', '+91 7017508056');
  const emails = parseDualField(dbRow.email, 'jaishivtradingco@gmail.com', 'jaishivtradingco@gmail.com');
  const logos = parseDualField(dbRow.logo_url, '', '');
  const bankNames = parseDualField(dbRow.bank_name, 'AXIS BANK', 'RAHUL CHAUHAN');
  const bankBranches = parseDualField(dbRow.bank_branch, 'TRANS YAMUNA COLONY PHASE -1', 'GANDHI NAGAR');
  const accountNames = parseDualField(dbRow.account_name, 'JAI SHIV TRADING COMPANY', 'RAHUL CHAUHAN');
  const accountNumbers = parseDualField(dbRow.account_number, '924020037111248', '6475108000034');
  const ifscCodes = parseDualField(dbRow.ifsc_code, 'UTIB0003333', 'CNRB0006475');
  const upiIds = parseDualField(dbRow.upi_id, '9027538830@AXISBANK', '9027538830@AXISBANK');

  // 3. Update active profile fields
  if (id === 1) {
    names.gst = settings.company_name;
    addresses.gst = settings.address || '';
    phones.gst = settings.phone || '';
    emails.gst = settings.email || '';
    logos.gst = settings.logo_url || '';
    bankNames.gst = settings.bank_name || '';
    bankBranches.gst = settings.bank_branch || '';
    accountNames.gst = settings.account_name || '';
    accountNumbers.gst = settings.account_number || '';
    ifscCodes.gst = settings.ifsc_code || '';
    upiIds.gst = settings.upi_id || '';
  } else {
    names.nongst = settings.company_name;
    addresses.nongst = settings.address || '';
    phones.nongst = settings.phone || '';
    emails.nongst = settings.email || '';
    logos.nongst = settings.logo_url || '';
    bankNames.nongst = settings.bank_name || '';
    bankBranches.nongst = settings.bank_branch || '';
    accountNames.nongst = settings.account_name || '';
    accountNumbers.nongst = settings.account_number || '';
    ifscCodes.nongst = settings.ifsc_code || '';
    upiIds.nongst = settings.upi_id || '';
  }

  // 4. Update the database row 1 (PATCH - fully bypassing the RLS insert constraint)
  const { data: updated, error: updateError } = await supabase
    .from("company_settings")
    .update({
      company_name: serializeDualField(names.gst, names.nongst),
      address: serializeDualField(addresses.gst, addresses.nongst),
      phone: serializeDualField(phones.gst, phones.nongst),
      email: serializeDualField(emails.gst, emails.nongst),
      logo_url: serializeDualField(logos.gst, logos.nongst),
      bank_name: serializeDualField(bankNames.gst, bankNames.nongst),
      bank_branch: serializeDualField(bankBranches.gst, bankBranches.nongst),
      account_name: serializeDualField(accountNames.gst, accountNames.nongst),
      account_number: serializeDualField(accountNumbers.gst, accountNumbers.nongst),
      ifsc_code: serializeDualField(ifscCodes.gst, ifscCodes.nongst),
      upi_id: serializeDualField(upiIds.gst, upiIds.nongst),
      gst_number: id === 1 ? settings.gst_number : dbRow.gst_number,
      pan: id === 1 ? settings.pan : dbRow.pan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  // Return the active profile representation
  if (id === 1) {
    return {
      id: 1,
      company_name: names.gst,
      address: addresses.gst,
      gst_number: updated.gst_number,
      pan: updated.pan,
      logo_url: logos.gst,
      phone: phones.gst,
      email: emails.gst,
      bank_name: bankNames.gst,
      bank_branch: bankBranches.gst,
      account_name: accountNames.gst,
      account_number: accountNumbers.gst,
      ifsc_code: ifscCodes.gst,
      upi_id: upiIds.gst,
      invoice_prefix: updated.invoice_prefix,
      updated_at: updated.updated_at,
    };
  } else {
    return {
      id: 2,
      company_name: names.nongst,
      address: addresses.nongst,
      gst_number: '',
      pan: '',
      logo_url: logos.nongst,
      phone: phones.nongst,
      email: emails.nongst,
      bank_name: bankNames.nongst,
      bank_branch: bankBranches.nongst,
      account_name: accountNames.nongst,
      account_number: accountNumbers.nongst,
      ifsc_code: ifscCodes.nongst,
      upi_id: upiIds.nongst,
      invoice_prefix: updated.invoice_prefix,
      updated_at: updated.updated_at,
    };
  }
};

// ============================================================
// INVOICE SETTINGS
// ============================================================

export const getInvoiceSettings = async (): Promise<InvoiceSettingsDB> => {
  const { data, error } = await supabase
    .from("invoice_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateInvoiceSettings = async (
  settings: Omit<InvoiceSettingsDB, "id" | "updated_at">
): Promise<InvoiceSettingsDB> => {
  const { data, error } = await supabase
    .from("invoice_settings")
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// ============================================================
// SYSTEM SETTINGS
// ============================================================

export const getSystemSettings = async (): Promise<SystemSettingsDB> => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateSystemSettings = async (
  settings: Omit<SystemSettingsDB, "id" | "updated_at">
): Promise<SystemSettingsDB> => {
  const { data, error } = await supabase
    .from("system_settings")
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};