export type UserRole = 'Owner' | 'Rahul' | 'Accountant';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Owner: [
    'dashboard',
    'billing',
    'product-catalog',
    'customer-ledger',
    'customers',
    'payments',
    'settings',
    'backup',
    'analytics'
  ],
  Rahul: [
    'dashboard',
    'billing',
    'product-catalog',
    'customers',
    'payments',
    'analytics'
  ],
  Accountant: [
    'dashboard',
    'billing',
    'payments',
    'customer-ledger',
    'analytics'
  ]
};

export type PartyType =
  | 'Customer'
  | 'Dyeing Processor'
  | 'Weaving Mill'
  | 'Yarn Supplier'
  | 'Transporter'
  | 'Supplier'
  | 'Manufacturer'
  | 'Distributor'
  | 'Service Provider';

export interface Party {
  id: string;
  name: string;
  code: string;
  type: PartyType;
  phone: string;
  email: string;
  city: string;
  state: string;
  gstin: string;
  pan?: string;          // optional PAN number
  creditLimit: number;
  currentBalance: number; // positive = receivable from party, negative = payable to party
  address: string;
  isBlocked?: boolean;   // soft block/deactivate flag
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  fabricType?: string;
  unit: string;
  hsnCode: string;
  gstRate: number; // percentage
  sellingPrice: number;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  hsnCode: string;
  meters: number;
  rate: number;
  discount?: number;
  amount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: string;
  date: string;
  dueDate: string;
  partyId: string;
  partyName: string;
  partyGstin: string;
  partyAddress: string;
  partyCity: string;
  partyState: string;
  isInterstate: boolean; // True -> IGST, False -> CGST + SGST
  items: InvoiceItem[];
  taxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  isGstInvoice: boolean; // true = GST Tax Invoice, false = Normal Invoice (no GST)
  status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'Overdue';
  paidAmount: number;
  eWayBillNo?: string;
  transporterName?: string;
  lrNumber?: string;
}

export interface LedgerEntry {
  id: string;
  partyId: string;
  date: string;
  voucherType: 'Sales Invoice' | 'Payment Receipt' | 'Purchase Bill' | 'Payment Made' | 'Credit Note' | 'Debit Note';
  voucherNumber: string;
  narration: string;
  debit: number;  // Amount party owes us (increases receivable)
  credit: number; // Amount party paid us (decreases receivable)
  runningBalance: number;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'NEFT' | 'RTGS' | 'Cheque';
export type PaymentStatus = 'Completed' | 'Pending' | 'Partial' | 'Advance';

export interface Payment {
  id: string;
  paymentNumber: string;
  partyId: string;
  partyName: string;
  invoiceNumber?: string;
  date: string;
  mode: PaymentMode;
  amount: number;
  remarks?: string;
  status: PaymentStatus;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickActions?: { label: string; action: () => void }[];
}
