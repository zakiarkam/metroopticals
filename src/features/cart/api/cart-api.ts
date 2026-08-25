import axiosInstance from "@/lib/axiosInstance";

export type CartItem = {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  /** The chosen colourway; empty when the product lists no colours. */
  color?: string;
  createdAt: string;
  updatedAt: string;
  product: {
    id: number;
    title: string;
    price: number;
    discountedPrice: number | null;
    images: string[];
    stock: number;
    status: string;
    frameColors?: string[];
  };
};

export type AddToCartInput = {
  productId: number;
  quantity: number;
  color?: string;
};

export type UpdateCartItemInput = {
  quantity: number;
  color?: string;
};

export const getCartItems = async (): Promise<{ cartItems: CartItem[] }> => {
  const response = await axiosInstance.get("/cart");
  const apiData = response.data;
  return {
    cartItems: apiData.data?.cartItems || apiData.cartItems || [],
  };
};

export const addToCart = async (
  data: AddToCartInput
): Promise<{ cartItem: CartItem }> => {
  const response = await axiosInstance.post("/cart", data);
  const apiData = response.data;
  return {
    cartItem: apiData.data?.cartItem || apiData.cartItem,
  };
};

export const updateCartItem = async (
  id: number,
  data: UpdateCartItemInput
): Promise<{ cartItem: CartItem }> => {
  const response = await axiosInstance.put(`/cart/${id}`, data);
  const apiData = response.data;
  return {
    cartItem: apiData.data?.cartItem || apiData.cartItem,
  };
};

export const removeFromCart = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/cart/${id}`);
};

export const clearCart = async (): Promise<void> => {
  await axiosInstance.delete("/cart");
};
