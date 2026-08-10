import axiosInstance from "@/lib/axiosInstance";

export type WishlistItem = {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
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

export type AddToWishlistInput = {
  productId: number;
};

export const getWishlistItems = async (): Promise<{
  wishlistItems: WishlistItem[];
}> => {
  try {
    const response = await axiosInstance.get("/wishlist");
    return response.data.data || response.data;
  } catch (error) {
    console.error("Failed to fetch wishlist items:", error);
    return { wishlistItems: [] };
  }
};

export const addToWishlist = async (
  data: AddToWishlistInput
): Promise<{ wishlistItem: WishlistItem }> => {
  const response = await axiosInstance.post("/wishlist", data);
  return response.data.data || response.data;
};

export const removeFromWishlist = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/wishlist/${id}`);
};

export const clearWishlist = async (): Promise<void> => {
  await axiosInstance.delete("/wishlist");
};
