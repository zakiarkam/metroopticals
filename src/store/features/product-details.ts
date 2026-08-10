import { createSlice } from "@reduxjs/toolkit";
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

export const productDetails = createSlice({
  name: "productDetails",
  initialState,
  reducers: {
    updateproductDetails: (_, action) => {
      return {
        value: {
          ...action.payload,
        },
      };
    },
  },
});

export const { updateproductDetails } = productDetails.actions;
export default productDetails.reducer;
