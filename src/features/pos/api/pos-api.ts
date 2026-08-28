import axiosInstance from "@/lib/axiosInstance";
import type {
  PosCustomer,
  PosProduct,
  PosReport,
  Sale,
  SalesResponse,
  StockMovement,
} from "@/features/pos/types/pos";

/**
 * Counter API client.
 *
 * `axiosInstance` already unwraps `{ success, data }`, but a couple of the
 * older endpoints answer unwrapped, so each call reads through both shapes
 * rather than assuming one.
 */
const unwrap = <T,>(payload: any): T =>
  (payload?.data && typeof payload.data === "object" ? payload.data : payload) as T;

export type PosProductSearchResult = {
  products: PosProduct[];
  /** A barcode or SKU matched exactly, so the till can add it straight away. */
  scanned: boolean;
};

export const searchPosProducts = async (params: {
  search?: string;
  categoryId?: number;
  brandId?: number;
  inStockOnly?: boolean;
  limit?: number;
  signal?: AbortSignal;
}): Promise<PosProductSearchResult> => {
  const { signal, ...query } = params;
  const response = await axiosInstance.get("/pos/products", {
    params: query,
    signal,
  });
  const data = unwrap<PosProductSearchResult>(response.data);
  return { products: data.products ?? [], scanned: !!data.scanned };
};

export const getPosFilters = async (): Promise<{
  categories: Array<{ id: number; name: string; parentId: number | null }>;
  brands: Array<{ id: number; name: string }>;
}> => {
  const response = await axiosInstance.get("/pos/products/filters");
  const data = unwrap<any>(response.data);
  return { categories: data.categories ?? [], brands: data.brands ?? [] };
};

export const findCustomerByPhone = async (
  phone: string,
  signal?: AbortSignal,
): Promise<PosCustomer | null> => {
  const response = await axiosInstance.get("/pos/customers", {
    params: { phone },
    signal,
  });
  return unwrap<{ customer: PosCustomer | null }>(response.data).customer ?? null;
};

export const getCustomers = async (params: {
  search?: string;
  optedInOnly?: boolean;
  sort?: "recent" | "spend" | "visits" | "name";
  page?: number;
  limit?: number;
}): Promise<{
  customers: PosCustomer[];
  summary: { total: number; optedIn: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const response = await axiosInstance.get("/pos/customers", { params });
  const data = unwrap<any>(response.data);
  return {
    customers: data.customers ?? [],
    summary: data.summary ?? { total: 0, optedIn: 0 },
    pagination: data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
};

export const updateCustomer = async (
  id: number,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    notes: string;
    marketingOptIn: boolean;
  }>,
): Promise<PosCustomer> => {
  const response = await axiosInstance.patch(`/pos/customers/${id}`, data);
  return unwrap<{ customer: PosCustomer }>(response.data).customer;
};

export const createCustomer = async (data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
}): Promise<PosCustomer> => {
  const response = await axiosInstance.post("/pos/customers", data);
  return unwrap<{ customer: PosCustomer }>(response.data).customer;
};

export type CreateSalePayload = {
  items: Array<{
    productId?: number | null;
    title?: string;
    quantity: number;
    unitPrice: number;
    lineDiscount?: number;
    color?: string | null;
  }>;
  discountAmount?: number;
  payments: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
  customer?: {
    id?: number | null;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    saveToBook?: boolean;
    marketingOptIn?: boolean;
  };
  notes?: string;
  collectLater?: boolean;
  /** `YYYY-MM-DD` when the rest of the money is expected. */
  balanceDueDate?: string;
};

export const createSale = async (payload: CreateSalePayload): Promise<Sale> => {
  const response = await axiosInstance.post("/pos/sales", payload);
  return unwrap<{ sale: Sale }>(response.data).sale;
};

export const getSales = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  cashierId?: number;
  channel?: "POS" | "ONLINE" | "ALL";
  status?: string;
}): Promise<SalesResponse> => {
  const response = await axiosInstance.get("/pos/sales", { params });
  const data = unwrap<SalesResponse>(response.data);
  return {
    sales: data.sales ?? [],
    summary: data.summary ?? { billed: 0, collected: 0, outstanding: 0 },
    pagination:
      data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
};

export const getSaleById = async (id: number): Promise<Sale> => {
  const response = await axiosInstance.get(`/pos/sales/${id}`);
  return unwrap<{ sale: Sale }>(response.data).sale;
};

export const addSalePayment = async (
  id: number,
  data: {
    method: string;
    amount: number;
    reference?: string;
    balanceDueDate?: string;
  },
): Promise<Sale> => {
  const response = await axiosInstance.post(`/pos/sales/${id}/payments`, data);
  return unwrap<{ sale: Sale }>(response.data).sale;
};

export const voidSale = async (id: number, reason: string): Promise<Sale> => {
  const response = await axiosInstance.post(`/pos/sales/${id}/void`, { reason });
  return unwrap<{ sale: Sale }>(response.data).sale;
};

export const returnSaleItems = async (
  id: number,
  data: {
    items: Array<{ itemId: number; quantity: number }>;
    refundAmount: number;
    refundMethod: string;
    restock: boolean;
    reason?: string;
  },
): Promise<Sale> => {
  const response = await axiosInstance.post(`/pos/sales/${id}/return`, data);
  return unwrap<{ sale: Sale }>(response.data).sale;
};

export const adjustStock = async (data: {
  productId: number;
  mode: "add" | "remove" | "set";
  quantity: number;
  reason?: "PURCHASE" | "ADJUSTMENT" | "RETURN";
  note?: string;
}) => {
  const response = await axiosInstance.post("/pos/stock/adjust", data);
  return unwrap<{ product: { id: number; title: string; stock: number } }>(
    response.data,
  );
};

export const getStockMovements = async (params: {
  productId?: number;
  reason?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  movements: StockMovement[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const response = await axiosInstance.get("/pos/stock/movements", { params });
  const data = unwrap<any>(response.data);
  return {
    movements: data.movements ?? [],
    pagination: data.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 1 },
  };
};

export const getLowStock = async (threshold = 10) => {
  const response = await axiosInstance.get("/pos/stock/low", {
    params: { threshold },
  });
  const data = unwrap<any>(response.data);
  return {
    products: data.products ?? [],
    threshold: data.threshold ?? threshold,
  };
};

export const getPosReport = async (params: {
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PosReport> => {
  const response = await axiosInstance.get("/pos/reports/daily", { params });
  return unwrap<PosReport>(response.data);
};

export type OutstandingBill = {
  id: number;
  orderNumber: string;
  customer: string;
  phone: string;
  createdAt: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  daysLate: number;
  overdue: boolean;
  awaitingCollection: boolean;
};

export const getOutstandingBills = async (): Promise<{
  bills: OutstandingBill[];
  summary: {
    count: number;
    total: number;
    overdueCount: number;
    overdueTotal: number;
    dueToday: number;
  };
}> => {
  const response = await axiosInstance.get("/pos/outstanding");
  const data = unwrap<any>(response.data);
  return {
    bills: data.bills ?? [],
    summary:
      data.summary ?? {
        count: 0,
        total: 0,
        overdueCount: 0,
        overdueTotal: 0,
        dueToday: 0,
      },
  };
};
