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
  /** The colourway this line is for  one line per colour. */
  color?: string;
  /** Every colour the product is sold in, for the in-cart colour switcher. */
  colorOptions?: string[];
  stock?: number;
  status?: string;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
  /** Prescription lenses fitted to this frame; absent on a bare frame. */
  lens?: {
    lensTypeId: number;
    lensTypeName: string;
    lensTypeSlug: string;
    /** The build — single vision, bifocal, progressive. */
    designId: number | null;
    designName: string | null;
    designKind: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
    tintId: number | null;
    tintName: string | null;
    tintHex: string | null;
    prescriptionId: number | null;
    prescriptionLabel: string | null;
    prescriptionVersion: number | null;
    /** Summary line for the cart row, e.g. "OD -2.25 … · OS …". */
    summary: string | null;
    /** Price for the pair, tint included. */
    price: number;
  } | null;
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
        color,
        colorOptions,
        imgs,
        stock,
        status,
        lens,
      } = action.payload;

      // A line is identified by product *and* colour: adding the tortoise of a
      // frame already in the cart in black is a new line, not a quantity bump.
      const existingItem = state.items.find(
        (item) =>
          (item.productId === productId || item.id === id) &&
          (item.color ?? "") === (color ?? ""),
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
          color,
          colorOptions,
          imgs,
          stock,
          status,
          lens,
        });
      }
      state.lastFetched = Date.now();
    },
    syncCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.synced = true;
      state.lastFetched = Date.now();
    },
    /**
     * The cart as it was left in this browser, restored on load.
     *
     * Deliberately not `syncCartItems`: those lines came from localStorage,
     * not from the server, and their prices, stock and status may be days
     * old. Leaving the cart unsynced with no fetch time is what tells the
     * cart hook to go and get the real one straight away.
     */
    hydrateCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.synced = false;
      state.lastFetched = null;
    },
    removeItemFromCart: (state, action: PayloadAction<number>) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
      state.lastFetched = Date.now();
    },
    updateCartItemQuantity: (
      state,
      action: PayloadAction<{ id: number; quantity: number }>,
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

/** What one line costs: the frame plus whatever lenses were fitted to it. */
export const lineUnitPrice = (item: {
  discountedPrice: number;
  lens?: { price: number } | null;
}) => item.discountedPrice + (item.lens?.price ?? 0);

export const selectTotalPrice = createSelector([selectCartItems], (items) => {
  return items.reduce(
    (total, item) => total + lineUnitPrice(item) * item.quantity,
    0,
  );
});

/** The lens half of the basket on its own, so the summary can name it. */
export const selectLensTotal = createSelector([selectCartItems], (items) =>
  items.reduce((total, item) => total + (item.lens?.price ?? 0) * item.quantity, 0),
);

export const {
  addItemToCart,
  syncCartItems,
  hydrateCartItems,
  removeItemFromCart,
  updateCartItemQuantity,
  removeAllItemsFromCart,
} = cart.actions;
export default cart.reducer;
