import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type InitialState = {
  items: WishListItem[];
  synced: boolean;
  lastFetched: number | null;
};

type WishListItem = {
  id: number; // productId
  wishlistItemId?: number;
  productId?: number;
  title: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  stock?: number;
  status?: string;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};

const initialState: InitialState = {
  items: [],
  synced: false,
  lastFetched: null,
};

export const wishlist = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    addItemToWishlist: (state, action: PayloadAction<WishListItem>) => {
      const {
        id,
        wishlistItemId,
        productId,
        title,
        price,
        quantity,
        stock,
        imgs,
        discountedPrice,
        status,
      } = action.payload;
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === id
      );

      const baseItem = {
        id,
        wishlistItemId,
        productId: productId || id,
        title,
        price,
        quantity,
        stock,
        imgs,
        discountedPrice,
        status,
      };

      if (existingItemIndex !== -1) {
        state.items[existingItemIndex] = {
          ...state.items[existingItemIndex],
          ...baseItem,
        };
      } else {
        state.items.push(baseItem);
      }
      state.lastFetched = Date.now();
    },
    syncWishlistItems: (state, action: PayloadAction<WishListItem[]>) => {
      state.items = action.payload;
      state.synced = true;
      state.lastFetched = Date.now();
    },
    removeItemFromWishlist: (
      state,
      action: PayloadAction<number>
    ) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
      state.lastFetched = Date.now();
    },

    removeAllItemsFromWishlist: (state) => {
      state.items = [];
      state.synced = false;
      state.lastFetched = Date.now();
    },
  },
});

export const {
  addItemToWishlist,
  syncWishlistItems,
  removeItemFromWishlist,
  removeAllItemsFromWishlist,
} = wishlist.actions;
export default wishlist.reducer;
