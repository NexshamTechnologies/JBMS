import { supabase } from "../lib/supabase";
import type { Payment, PaymentMode, PaymentStatus } from "../types";

const TABLE = "payments";

interface PaymentRow {
  id: number;
  customer_id: number;
  invoice_id: number | null;
  payment_mode: string;
  payment_type: string;
  amount: number;
  payment_date: string;
  remarks: string | null;
  created_at: string;
  recorded_by: string;

  customers?: {
    customer_name: string;
  } | null;

  invoices?: {
    invoice_number: string;
  } | null;
}

/* =======================================================
   STATUS <-> DATABASE PAYMENT TYPE
======================================================= */

function statusToPaymentType(status: PaymentStatus): string {
  switch (status) {
    case "Partial":
      return "Partial";

    case "Advance":
      return "Advance";

    case "Pending":
      return "Pending";

    case "Completed":
    default:
      return "Full";
  }
}

function paymentTypeToStatus(type: string): PaymentStatus {
  switch (type) {
    case "Partial":
      return "Partial";

    case "Advance":
      return "Advance";

    case "Pending":
      return "Pending";

    case "Full":
    default:
      return "Completed";
  }
}

/* =======================================================
   DATABASE -> FRONTEND
======================================================= */

function mapRowToPayment(row: PaymentRow): Payment {
  return {
    id: String(row.id),

    paymentNumber: `REC-${String(row.id).padStart(6, "0")}`,

    partyId: String(row.customer_id),

    partyName:
      row.customers?.customer_name ??
      `Customer #${row.customer_id}`,

    invoiceNumber:
      row.invoices?.invoice_number ??
      undefined,

    date: row.payment_date,

    mode: row.payment_mode as PaymentMode,

    amount: Number(row.amount),

    remarks: row.remarks ?? undefined,

    status: paymentTypeToStatus(row.payment_type),
  };
}

/* =======================================================
   GET ALL PAYMENTS
======================================================= */

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      customers (
        customer_name
      ),
      invoices (
        invoice_number
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data as PaymentRow[]).map(mapRowToPayment);
}

/* =======================================================
   CREATE PAYMENT
======================================================= */

export async function createPayment(
  payment: Payment,
  recordedBy: string
): Promise<Payment> {

  const customerId = Number(payment.partyId);

  if (!Number.isInteger(customerId)) {
    throw new Error(
      `Invalid customer ID: ${payment.partyId}`
    );
  }

  let invoiceId: number | null = null;

  /*
   * Invoice number is what the frontend currently stores.
   * Resolve it to the actual integer invoice_id.
   */
  if (payment.invoiceNumber?.trim()) {

    const { data: invoice, error: invoiceError } =
      await supabase
        .from("invoices")
        .select("id")
        .eq(
          "invoice_number",
          payment.invoiceNumber.trim()
        )
        .maybeSingle();

    if (invoiceError) {
      throw new Error(
        `Failed to find invoice: ${invoiceError.message}`
      );
    }

    if (!invoice) {
      throw new Error(
        `Invoice ${payment.invoiceNumber} was not found.`
      );
    }

    invoiceId = invoice.id;
  }

  const payload = {
    customer_id: customerId,

    invoice_id: invoiceId,

    payment_mode: payment.mode,

    payment_type:
      statusToPaymentType(payment.status),

    amount: Number(payment.amount),

    payment_date: payment.date,

    remarks: payment.remarks ?? null,

    recorded_by: recordedBy,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select(`
      *,
      customers (
        customer_name
      ),
      invoices (
        invoice_number
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToPayment(data as PaymentRow);
}

/* =======================================================
   UPDATE PAYMENT
======================================================= */

export async function updatePayment(
  id: string,
  payment: Payment
): Promise<Payment> {

  const paymentId = Number(id);

  if (!Number.isInteger(paymentId)) {
    throw new Error(
      `Invalid payment ID: ${id}`
    );
  }

  const customerId = Number(payment.partyId);

  if (!Number.isInteger(customerId)) {
    throw new Error(
      `Invalid customer ID: ${payment.partyId}`
    );
  }

  let invoiceId: number | null = null;

  if (payment.invoiceNumber?.trim()) {

    const { data: invoice, error: invoiceError } =
      await supabase
        .from("invoices")
        .select("id")
        .eq(
          "invoice_number",
          payment.invoiceNumber.trim()
        )
        .maybeSingle();

    if (invoiceError) {
      throw new Error(
        `Failed to find invoice: ${invoiceError.message}`
      );
    }

    if (!invoice) {
      throw new Error(
        `Invoice ${payment.invoiceNumber} was not found.`
      );
    }

    invoiceId = invoice.id;
  }

  const payload = {
    customer_id: customerId,

    invoice_id: invoiceId,

    payment_mode: payment.mode,

    payment_type:
      statusToPaymentType(payment.status),

    amount: Number(payment.amount),

    payment_date: payment.date,

    remarks: payment.remarks ?? null,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", paymentId)
    .select(`
      *,
      customers (
        customer_name
      ),
      invoices (
        invoice_number
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToPayment(data as PaymentRow);
}

/* =======================================================
   DELETE PAYMENT
======================================================= */

export async function deletePayment(
  id: string
): Promise<void> {

  const paymentId = Number(id);

  if (!Number.isInteger(paymentId)) {
    throw new Error(
      `Invalid payment ID: ${id}`
    );
  }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", paymentId);

  if (error) {
    throw new Error(error.message);
  }
}