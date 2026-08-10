import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "@/features/products/types/product";

type InitialState = {
  value: Partial<Product> & {
    id?: string;
    title?: string;
  };
};

const initialState: InitialState = {
  value: {},
};

export const quickView = createSlice({
  name: "quickView",
  initialState,
  reducers: {
    updateQuickView: (_, action) => {
      return {
        value: {
          ...action.payload,
        },
      };
    },

    resetQuickView: () => {
      return {
        value: {},
      };
    },
  },
});

export const { updateQuickView, resetQuickView } = quickView.actions;
export default quickView.reducer;
