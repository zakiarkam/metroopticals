import axiosInstance from "@/lib/axiosInstance";
import { Order, OrdersResponse, UpdateOrderStatusInput } from "@/features/orders/types/order";

export const getOrders = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  ownOnly?: boolean;
}): Promise<OrdersResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.ownOnly) queryParams.append("ownOnly", "true");

    const response = await axiosInstance.get(
      `/orders${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
    );

    // Handle response structure
    const apiData = response.data;
    const responseData = apiData.data || apiData;

    return {
      orders: responseData.orders || [],
      pagination: responseData.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

export const getOrderById = async (orderId: number): Promise<Order> => {
  const response = await axiosInstance.get(`/orders/${orderId}`);
  return response.data.data?.order || response.data.order;
};

export const updateOrderStatus = async (
  orderId: number,
  data: UpdateOrderStatusInput
): Promise<Order> => {
  const response = await axiosInstance.patch(`/orders/${orderId}`, data);
  return response.data.order;
};

export type CreateOrderInput = {
  items: Array<{ productId: number; quantity: number; price: number; color?: string }>;
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
