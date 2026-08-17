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

// ============================================================
// COMPANY SETTINGS
// ============================================================

export const getCompanySettings = async (): Promise<CompanySettingsDB> => {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateCompanySettings = async (
  settings: Omit<CompanySettingsDB, "id" | "updated_at">
): Promise<CompanySettingsDB> => {
  const { data, error } = await supabase
    .from("company_settings")
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