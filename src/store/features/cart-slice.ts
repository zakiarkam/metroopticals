import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

type InitialState = {
  items: CartItem[];
  synced: boolean;
  lastFetched: number | null;
};

type CartItem = {
  id: number; // Cart item ID
  productId?: number; // Product ID
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

export const cart = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItemToCart: (state, action: PayloadAction<CartItem>) => {
      const {
        id,
        productId,
        title,
        price,
        quantity,
        discountedPrice,
        imgs,
        stock,
        status,
      } = action.payload;

      // Check if item exists by productId (for API items) or id (for legacy items)
      const existingItem = state.items.find(
        (item) => item.productId === productId || item.id === id
      );

      if (existingItem) {
        const max = existingItem.stock ?? stock;
        const newQuantity = max
          ? Math.min(existingItem.quantity + quantity, max)
          : existingItem.quantity + quantity;
        existingItem.quantity = newQuantity;
      } else {
        state.items.push({
          id,
          productId,
          title,
          price,
          quantity,
          discountedPrice,
          imgs,
          stock,
          status,
        });
      }
      state.lastFetched = Date.now();
    },
    syncCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.synced = true;
      state.lastFetched = Date.now();
    },
    removeItemFromCart: (state, action: PayloadAction<number>) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
      state.lastFetched = Date.now();
    },
    updateCartItemQuantity: (
      state,
      action: PayloadAction<{ id: number; quantity: number }>
    ) => {
      const { id, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === id);

      if (existingItem) {
        existingItem.quantity = quantity;
        state.lastFetched = Date.now();
      }
    },
    removeAllItemsFromCart: (state) => {
      state.items = [];
      state.synced = false;
      state.lastFetched = Date.now();
    },
  },
});

export const selectCartItems = (state: RootState) => state.cartReducer.items;

export const selectTotalPrice = createSelector([selectCartItems], (items) => {
  return items.reduce((total, item) => {
    return total + item.discountedPrice * item.quantity;
  }, 0);
});

export const {
  addItemToCart,
  syncCartItems,
  removeItemFromCart,
  updateCartItemQuantity,
  removeAllItemsFromCart,
} = cart.actions;
export default cart.reducer;
