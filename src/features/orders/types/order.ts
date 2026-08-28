export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: number;
  orderId: number;
  /** Null on a counter service line, and once a product is deleted. */
  productId?: number | null;
  quantity: number;
  price: number;
  discountedPrice?: number | null;
  /** The name as sold. The only name a service line has. */
  title?: string | null;
  /** Per-line discount in rupees, applied before the bill-level discount. */
  lineDiscount?: number;
  /** How many of this line the customer has since returned. */
  returnedQty?: number;
  /** The colourway as sold, frozen at checkout. */
  color?: string | null;
  createdAt: string;
  product?: {
    id: number;
    title: string;
    slug: string;
    description?: string;
    price: number;
    discountedPrice?: number | null;
    images: string[] | { previews?: string[]; thumbnails?: string[] };
    stock: number;
    status: string;
    category?: {
      id: number;
      name: string;
      slug: string;
    } | null;
  } | null;
}

/** Where the sale happened: a storefront checkout, or the shop counter. */
export type OrderChannel = "ONLINE" | "POS";

/** How much of a bill has actually been collected. */
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";

export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "ONLINE";

export interface OrderPayment {
  id: number;
  orderId: number;
  method: PaymentMethod;
  /** Positive for a collection, negative for a refund. */
  amount: number;
  reference?: string | null;
  createdAt: string;
  createdBy?: { id: number; name: string | null } | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  /** Null for a walk-in customer with no storefront account. */
  userId?: number | null;
  status: OrderStatus;
  channel?: OrderChannel;
  paymentStatus?: PaymentStatus;
  /** Bill-level discount in rupees. */
  discountAmount?: number;
  amountPaid?: number;
  voidedAt?: string | null;
  voidReason?: string | null;
  /** When the rest of a part-paid counter bill is expected. */
  balanceDueDate?: string | null;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  paymentMethod?: string | null;
  shippingMethod?: string | null;
  notes?: string | null;
  billingName: string;
  billingEmail?: string | null;
  billingPhone: string;
  billingAddress: string;
  billingCity: string;
  billingCountry: string;
  billingPostalCode?: string | null;
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPostalCode?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments?: OrderPayment[];
  user?: {
    id: number;
    name: string;
    email: string;
    customerType?: string | null;
  } | null;
  /** The shop's own customer-book entry, when the bill was written at the counter. */
  customer?: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  /** The admin who wrote the bill. */
  createdBy?: { id: number; name: string | null } | null;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}
