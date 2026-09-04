import axiosInstance from "@/lib/axiosInstance";

export type CartItemLens = {
  lensTypeId: number | null;
  /** How the pair is made - single vision, bifocal, progressive. */
  lensDesignKind: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  lensTintId: number | null;
  prescriptionId: number | null;
  /** Price for the pair of lenses on this line, tint included. */
  lensPrice: number;
  /** True when this power is made to order rather than cut from stock. */
  lensIsOrderLens?: boolean;
  /** Working days quoted for it, when the shop publishes a figure. */
  lensLeadTimeDays?: number | null;
  lensType?: {
    id: number;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
  lensTint?: {
    id: number;
    name: string;
    hex: string | null;
    surcharge: number;
  } | null;
  prescription?: {
    id: number;
    label: string;
    version: number;
    [key: string]: unknown;
  } | null;
};

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
    /** Per-colour rows; a null stock means the colour is not counted. */
    colorStocks?: { color: string; stock: number | null }[];
  };
} & Partial<CartItemLens>;

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
  data: AddToCartInput,
): Promise<{ cartItem: CartItem }> => {
  const response = await axiosInstance.post("/cart", data);
  const apiData = response.data;
  return {
    cartItem: apiData.data?.cartItem || apiData.cartItem,
  };
};

export const updateCartItem = async (
  id: number,
  data: UpdateCartItemInput,
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

/** A basket line whose lens price moved, or can no longer be priced at all. */
export type RepricedLine = {
  id: number;
  title: string;
  from: number;
  /** Null when the lens can no longer be sold at any price. */
  to: number | null;
  reason: string | null;
};

/**
 * Bring the basket's lens prices up to date with the live price list.
 *
 * Run once when the checkout opens, so a price that moved while the basket
 * sat open is shown before the customer fills in an address rather than after.
 */
export const repriceCartLenses = async (): Promise<RepricedLine[]> => {
  const { data } = await axiosInstance.post("/cart/reprice", {});
  return (data.data ?? data).changed ?? [];
};

/**
 * Fit lenses to a line, or take them off with `lensTypeId: null`.
 *
 * No price is sent: the server re-quotes from the live price list, so what
 * ends up on the line is what the shop actually charges today.
 */
export const setCartItemLens = async (
  id: number,
  data: {
    lensTypeId: number | null;
    lensDesignKind?: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";
    lensTintId?: number | null;
    prescriptionId?: number | null;
  },
): Promise<{ cartItem: CartItem }> => {
  const response = await axiosInstance.put(`/cart/${id}/lens`, data);
  const apiData = response.data;
  return { cartItem: apiData.data?.cartItem || apiData.cartItem };
};
