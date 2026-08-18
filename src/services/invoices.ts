import { supabase } from "../lib/supabase";
import type { Invoice, InvoiceItem } from "../types";

const TABLE = "invoices";

interface InvoiceRow {
  id: number;
  invoice_number: string;
  customer_id: number;
  invoice_date: string;
  is_gst: boolean;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  grand_total: number;
  created_at: string;
  created_by: string;
}

interface InvoiceItemRow {
  id: number;
  invoice_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  gst_rate: number;
  line_total: number;
}

function mapInvoiceItem(row: any): InvoiceItem {
  const gstAmount =
    Number(row.line_total) -
    Math.max(
      0,
      Number(row.quantity) * Number(row.unit_price) -
        Number(row.discount_amount)
    );

  return {
    id: String(row.id),
    productId: String(row.product_id),
    description: row.products?.name ?? "",
    hsnCode: row.products?.hsn_code ?? "",
    meters: Number(row.quantity),
    rate: Number(row.unit_price),
    discount: Number(row.discount_amount),
    amount:
      Number(row.quantity) * Number(row.unit_price) -
      Number(row.discount_amount),
    gstPercent: Number(row.gst_rate),
    cgstAmount: gstAmount / 2,
    sgstAmount: gstAmount / 2,
    igstAmount: 0,
    totalAmount: Number(row.line_total),
  };
}
















export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      invoice_items (*, products (*)),
      customers (*)
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(`Failed to load invoices: ${error.message}`);
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return [];
  }

  // -------------------------------------------------------
  // Load payments linked to these invoices
  // -------------------------------------------------------

  const invoiceIds = rows.map((row: any) => Number(row.id));

  const { data: paymentRows, error: paymentError } = await supabase
    .from("payments")
    .select("invoice_id, amount, payment_type")
    .in("invoice_id", invoiceIds);

  if (paymentError) {
    throw new Error(
      `Failed to load invoice payments: ${paymentError.message}`
    );
  }

  // -------------------------------------------------------
  // Calculate total paid for each invoice
  // -------------------------------------------------------

  const paidByInvoice = new Map<number, number>();

  for (const payment of paymentRows ?? []) {
    if (!payment.invoice_id) continue;

    // Pending payment is not actual received money
    if (payment.payment_type === "Pending") {
      continue;
    }

    const invoiceId = Number(payment.invoice_id);
    const amount = Number(payment.amount) || 0;

    paidByInvoice.set(
      invoiceId,
      (paidByInvoice.get(invoiceId) || 0) + amount
    );
  }

  // -------------------------------------------------------
  // Build frontend invoices
  // -------------------------------------------------------

  return rows.map((row: any) => {
    const invoice = row as InvoiceRow;

    const items = (row.invoice_items ?? []).map(
      (item: InvoiceItemRow) => mapInvoiceItem(item)
    );

    const gstAmount = Number(invoice.gst_amount) || 0;
    const grandTotal = Number(invoice.grand_total) || 0;

    const totalReceived =
      paidByInvoice.get(Number(invoice.id)) || 0;

    // Never let invoice-paid amount exceed invoice total.
    // Any excess is customer advance/credit.
    const paidAmount = Math.min(
      totalReceived,
      grandTotal
    );

    let status: Invoice["status"];

    if (paidAmount <= 0) {
      status = "Unpaid";
    } else if (paidAmount < grandTotal) {
      status = "Partially Paid";
    } else {
      status = "Paid";
    }

    return {
      id: String(invoice.id),
      invoiceNumber: invoice.invoice_number,

      date: invoice.invoice_date,
      dueDate: invoice.invoice_date,

      partyId: String(invoice.customer_id),
      partyName: (row.customers as any)?.customer_name ?? "",
      partyGstin: (row.customers as any)?.gst_number ?? "",
      partyAddress: (row.customers as any)?.address ?? "",
      partyCity: (row.customers as any)?.address?.split(",").pop()?.trim() ?? "",
      partyState: "",

      isInterstate: false,

      items,

      taxableValue: Number(invoice.subtotal) || 0,

      cgstTotal: gstAmount / 2,
      sgstTotal: gstAmount / 2,
      igstTotal: 0,

      roundOff: 0,

      grandTotal,

      isGstInvoice: invoice.is_gst,

      status,

      paidAmount,

      eWayBillNo: undefined,
      transporterName: undefined,
      lrNumber: undefined,
    };
  });
}







export async function getInvoiceById(
  id: string
): Promise<Invoice> {
  const invoiceId = Number(id);

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    throw new Error("Invalid invoice ID.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(`
      *,
      invoice_items (*, products (*)),
      customers (*)
    `)
    .eq("id", invoiceId)
    .single();

  if (error) {
    throw new Error(`Failed to load invoice: ${error.message}`);
  }

  if (!data) {
    throw new Error("Invoice not found.");
  }

  const invoice = data as InvoiceRow;

  // -------------------------------------------------------
  // Load payments linked to this invoice
  // -------------------------------------------------------

  const { data: paymentRows, error: paymentError } =
    await supabase
      .from("payments")
      .select("amount, payment_type")
      .eq("invoice_id", invoiceId);

  if (paymentError) {
    throw new Error(
      `Failed to load invoice payments: ${paymentError.message}`
    );
  }

  // -------------------------------------------------------
  // Calculate actual amount received
  // -------------------------------------------------------

  const totalReceived = (paymentRows ?? []).reduce(
    (sum, payment) => {
      // Pending payments are not actual received money
      if (payment.payment_type === "Pending") {
        return sum;
      }

      return sum + (Number(payment.amount) || 0);
    },
    0
  );

  const grandTotal = Number(invoice.grand_total) || 0;

  // Do not allow invoice paid amount to exceed invoice total.
  // Excess remains customer-level advance/credit.
  const paidAmount = Math.min(
    totalReceived,
    grandTotal
  );

  let status: Invoice["status"];

  if (paidAmount <= 0) {
    status = "Unpaid";
  } else if (paidAmount < grandTotal) {
    status = "Partially Paid";
  } else {
    status = "Paid";
  }

  // -------------------------------------------------------
  // Invoice items
  // -------------------------------------------------------

  const items = ((data as any).invoice_items ?? []).map(
    (item: InvoiceItemRow) => mapInvoiceItem(item)
  );

  const gstAmount = Number(invoice.gst_amount) || 0;

  return {
    id: String(invoice.id),
    invoiceNumber: invoice.invoice_number,

    date: invoice.invoice_date,
    dueDate: invoice.invoice_date,

    partyId: String(invoice.customer_id),
    partyName: (data as any).customers?.customer_name ?? "",
    partyGstin: (data as any).customers?.gst_number ?? "",
    partyAddress: (data as any).customers?.address ?? "",
    partyCity: (data as any).customers?.address?.split(",").pop()?.trim() ?? "",
    partyState: "",

    isInterstate: false,

    items,

    taxableValue: Number(invoice.subtotal) || 0,

    cgstTotal: gstAmount / 2,
    sgstTotal: gstAmount / 2,
    igstTotal: 0,

    roundOff: 0,

    grandTotal,

    isGstInvoice: invoice.is_gst,

    status,

    paidAmount,
  };
}







export async function createInvoice(
  invoice: Invoice,
  createdBy: string
): Promise<Invoice> {
  const customerId = Number(invoice.partyId);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("Select a valid customer before creating the invoice.");
  }

  if (!createdBy) {
    throw new Error("Authenticated user profile not found.");
  }

  if (invoice.items.length === 0) {
    throw new Error("Add at least one invoice item.");
  }

  const invoiceItems = invoice.items.map((item) => {
    const productId = Number(item.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error(`Invoice item \"${item.description}\" does not have a valid product.`);
    }

    if (!Number.isFinite(Number(item.meters)) || Number(item.meters) <= 0) {
      throw new Error(`Invoice item \"${item.description}\" must have a quantity greater than zero.`);
    }

    return {
      product_id: productId,
      quantity: Number(item.meters),
      unit_price: Number(item.rate),
      discount_amount: Number(item.discount || 0),
      gst_rate: Number(item.gstPercent),
      line_total: Number(item.totalAmount),
    };
  });

  const invoicePayload = {
    invoice_number: invoice.invoiceNumber,
    customer_id: customerId,
    invoice_date: invoice.date,
    is_gst: invoice.isGstInvoice,
    subtotal: invoice.taxableValue,
    discount_amount: invoice.items.reduce(
      (sum, item) => sum + Number(item.discount || 0),
      0
    ),
    gst_amount:
      Number(invoice.cgstTotal) +
      Number(invoice.sgstTotal) +
      Number(invoice.igstTotal),
    grand_total: invoice.grandTotal,
    created_by: createdBy,
  };

  const { data: invoiceData, error: invoiceError } =
    await supabase
      .from("invoices")
      .insert(invoicePayload)
      .select()
      .single();

  if (invoiceError) {
    throw new Error(
      `Failed to create invoice: ${invoiceError.message}`
    );
  }

  if (!invoiceData) {
    throw new Error("Invoice creation returned no data.");
  }

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItems.map((item) => ({
      ...item,
      invoice_id: Number(invoiceData.id),
    })));

  if (itemsError) {
    // A browser-side multi-step insert is not transactional. Remove the parent
    // row so a failed item insert cannot leave an incomplete invoice behind.
    const { error: rollbackError } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", invoiceData.id);

    const rollbackDetail = rollbackError
      ? ` The incomplete invoice could not be removed: ${rollbackError.message}`
      : "";

    throw new Error(
      `Failed to save invoice items: ${itemsError.message}.${rollbackDetail}`
    );
  }

  return {
    ...invoice,
    id: String(invoiceData.id),
    invoiceNumber: invoiceData.invoice_number,
    date: invoiceData.invoice_date,
    partyId: String(invoiceData.customer_id),
    taxableValue: Number(invoiceData.subtotal),
    grandTotal: Number(invoiceData.grand_total),
    isGstInvoice: invoiceData.is_gst,
  };
}

export async function getNextInvoiceNumber(fyPrefix: string): Promise<string> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("invoice_number")
    .like("invoice_number", `${fyPrefix}%`);

  if (error) {
    throw new Error(`Failed to check existing invoice numbers: ${error.message}`);
  }

  let maxNum = 0;
  (data ?? []).forEach((row: any) => {
    const suffix = row.invoice_number.substring(fyPrefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  return `${fyPrefix}${maxNum + 1}`;
}

