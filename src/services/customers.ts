import { supabase } from "../lib/supabase";
import type { Party } from "../types";

const TABLE = "customers";

interface CustomerRow {
  id: number;
  customer_name: string;
  mobile_number: string | null;
  address: string | null;
  gst_number: string | null;
  pan: string | null;
  email: string | null;
  customer_type: "GST" | "Non-GST";
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Database -> Frontend
 */
function mapRowToParty(row: CustomerRow): Party {
  return {
    id: String(row.id),

    name: row.customer_name,

    code: `CUST-${row.id}`,

    type: "Customer",

    phone: row.mobile_number ?? "",

    email: row.email ?? "",

    city:
      row.address?.split(",").pop()?.trim() ?? "",

    state: "",

    gstin: row.gst_number ?? "",

    pan: row.pan ?? "",

    creditLimit: 0,

    currentBalance: 0,

    address: row.address ?? "",

    isBlocked: row.is_blocked,
  };
}

/**
 * Frontend -> Database
 */
function mapPartyToRow(
  party: Partial<Party>
) {
  return {

    ...(party.name !== undefined && {
      customer_name: party.name,
    }),

    ...(party.phone !== undefined && {
      mobile_number: party.phone,
    }),

    ...(party.address !== undefined && {
      address: party.address,
    }),

    ...(party.gstin !== undefined && {
      gst_number: party.gstin,
    }),

    ...(party.pan !== undefined && {
      pan: party.pan,
    }),

    ...(party.email !== undefined && {
      email: party.email,
    }),

    ...(party.isBlocked !== undefined && {
      is_blocked: party.isBlocked,
    }),

    customer_type:
      party.gstin && party.gstin.length > 0
        ? "GST"
        : "Non-GST",
  };
}

/* ========================================= */

export async function getCustomers(): Promise<Party[]> {

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw new Error(error.message);

  return (data as CustomerRow[]).map(
    mapRowToParty
  );
}

/* ========================================= */

export async function createCustomer(
  party: Party
): Promise<Party> {

  const { data, error } = await supabase
    .from(TABLE)
    .insert(mapPartyToRow(party))
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapRowToParty(
    data as CustomerRow
  );
}

/* ========================================= */

export async function updateCustomer(
  id: string,
  party: Partial<Party>
): Promise<Party> {

  const { data, error } = await supabase
    .from(TABLE)
    .update(mapPartyToRow(party))
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapRowToParty(
    data as CustomerRow
  );
}

/* ========================================= */

export async function deleteCustomer(
  id: string
): Promise<void> {

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}