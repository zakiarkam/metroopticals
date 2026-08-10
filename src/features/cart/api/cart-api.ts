import axiosInstance from "@/lib/axiosInstance";

export type CartItem = {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
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
  };
};

export type AddToCartInput = {
  productId: number;
  quantity: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

export const getCartItems = async (): Promise<{ cartItems: CartItem[] }> => {
  try {
    const response = await axiosInstance.get("/cart");
    const apiData = response.data;
    return {
      cartItems: apiData.data?.cartItems || apiData.cartItems || [],
    };
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    return { cartItems: [] };
  }
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
