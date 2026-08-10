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
  productId: number;
  quantity: number;
  price: number;
  discountedPrice?: number | null;
  createdAt: string;
  product: {
    id: number;
    title: string;
    slug: string;
    description?: string;
    price: number;
    discountedPrice?: number | null;
    images: string[] | { previews?: string[]; thumbnails?: string[] };
    stock: number;
    status: string;
    category: {
      id: number;
      name: string;
      slug: string;
    };
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  paymentMethod?: string | null;
  shippingMethod?: string | null;
  notes?: string | null;
  billingName: string;
  billingEmail: string;
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
  user: {
    id: number;
    name: string;
    email: string;
    customerType?: string | null;
  };
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
