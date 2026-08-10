import axiosInstance from "@/lib/axiosInstance";

export type CreateOrderInput = {
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
  // shippingFee: number;
  paymentMethod: string;
  shippingMethod: string;
  notes?: string;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress: string;
  billingCity: string;
  billingCountry?: string;
  billingPostalCode?: string;
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingCountry?: string;
  shippingPostalCode?: string;
};

export const createOrder = async (data: CreateOrderInput) => {
  const response = await axiosInstance.post("/orders", data);
  return response.data.data || response.data;
};

export const getOrders = async (params?: any) => {
  const response = await axiosInstance.get("/orders", { params });
  return response.data.data || response.data;
};

export const getOrderById = async (id: number) => {
  const response = await axiosInstance.get(`/orders/${id}`);
  return response.data.data || response.data;
};
