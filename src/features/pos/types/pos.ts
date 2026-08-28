export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "ONLINE";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";
export type StockReason =
  | "SALE"
  | "ONLINE_ORDER"
  | "RETURN"
  | "VOID"
  | "PURCHASE"
  | "ADJUSTMENT";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  ONLINE: "Online",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Unpaid",
  PARTIAL: "Part paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  SALE: "Counter sale",
  ONLINE_ORDER: "Website order",
  RETURN: "Customer return",
  VOID: "Bill cancelled",
  PURCHASE: "Stock received",
  ADJUSTMENT: "Correction",
};

export interface PosProduct {
  id: number;
  title: string;
  slug: string;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  discountedPrice?: number | null;
  stock: number;
  status: string;
  images: string[];
  unitType?: string | null;
  frameColors: string[];
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
}

export interface PosCustomer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  marketingOptIn?: boolean;
  lastVisitAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { orders: number };
  stats?: { bills: number; spent: number; owed: number };
}

/** One line on the bill being written, before it is saved. */
export interface CartLine {
  /** Stable key for React and for edits; not the product id. */
  key: string;
  productId: number | null;
  title: string;
  sku?: string | null;
  image?: string | null;
  quantity: number;
  /** What the catalogue asks for, kept so an override is visible as one. */
  catalogueUnitPrice: number;
  /** What is actually being charged per unit. */
  unitPrice: number;
  lineDiscount: number;
  color?: string | null;
  /** What is on the shelf, so the till can stop overselling. Null for services. */
  availableStock: number | null;
}

export interface CartCustomerDraft {
  id?: number | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  /** Keep these details in the book. On by default; they can say no. */
  saveToBook: boolean;
  /** They ticked yes to offers. Never assumed. */
  marketingOptIn: boolean;
}

export interface CartPaymentDraft {
  key: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
}

export interface SaleItem {
  id: number;
  productId?: number | null;
  title?: string | null;
  quantity: number;
  returnedQty: number;
  price: number;
  discountedPrice?: number | null;
  lineDiscount: number;
  color?: string | null;
  product?: {
    id: number;
    title: string;
    slug: string;
    sku?: string | null;
    images: string[];
    unitType?: string | null;
    stock?: number;
  } | null;
}

export interface SalePayment {
  id: number;
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  createdAt: string;
  createdBy?: { id: number; name: string | null } | null;
}

export interface Sale {
  id: number;
  orderNumber: string;
  channel: "POS" | "ONLINE";
  status: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod?: string | null;
  notes?: string | null;
  billingName: string;
  billingPhone: string;
  billingEmail?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  /** When the rest of the money is expected, on a part-paid bill. */
  balanceDueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
  payments?: SalePayment[];
  customer?: PosCustomer | null;
  createdBy?: { id: number; name: string | null; email?: string } | null;
}

export interface SaleListRow {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: PaymentStatus;
  channel: "POS" | "ONLINE";
  totalAmount: number;
  amountPaid: number;
  discountAmount: number;
  paymentMethod?: string | null;
  billingName: string;
  billingPhone: string;
  createdAt: string;
  voidedAt?: string | null;
  balanceDueDate?: string | null;
  items: Array<{ id: number; quantity: number; title?: string | null }>;
  customer?: { id: number; name: string; phone: string } | null;
  createdBy?: { id: number; name: string | null } | null;
  payments?: Array<{ id: number; method: PaymentMethod; amount: number }>;
}

export interface SalesResponse {
  sales: SaleListRow[];
  summary: { billed: number; collected: number; outstanding: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface StockMovement {
  id: number;
  delta: number;
  reason: StockReason;
  note?: string | null;
  createdAt: string;
  product?: { id: number; title: string; sku?: string | null; stock: number } | null;
  order?: { id: number; orderNumber: string; channel: string } | null;
  createdBy?: { id: number; name: string | null } | null;
}

export interface PosReport {
  range: { startDate: string; endDate: string; isSingleDay: boolean };
  summary: {
    bills: number;
    cancelledBills: number;
    itemsSold: number;
    billed: number;
    collected: number;
    refunded: number;
    outstanding: number;
    discountGiven: number;
    averageBill: number;
    onlineRevenue: number;
    onlineOrders: number;
  };
  byMethod: Array<{
    method: PaymentMethod;
    collected: number;
    refunded: number;
    net: number;
    count: number;
  }>;
  byCashier: Array<{
    id: number | null;
    name: string;
    bills: number;
    billed: number;
    collected: number;
  }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  daily: Array<{ date: string; bills: number; billed: number; collected: number }>;
  unpaidBills: Array<{
    id: number;
    orderNumber: string;
    customer: string;
    createdAt: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
  }>;
}
