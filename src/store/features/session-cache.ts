import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { StoredUser } from "@/lib/sessionStorage";

type SessionCacheState = {
  user: StoredUser | null;
  lastUpdated: number | null;
};

const initialState: SessionCacheState = {
  user: null,
  lastUpdated: null,
};

const sessionCache = createSlice({
  name: "sessionCache",
  initialState,
  reducers: {
    setSessionUser: (state, action: PayloadAction<StoredUser>) => {
      state.user = action.payload;
      state.lastUpdated = Date.now();
    },
    clearSessionUser: (state) => {
      state.user = null;
      state.lastUpdated = Date.now();
    },
  },
});

export const { setSessionUser, clearSessionUser } = sessionCache.actions;
export default sessionCache.reducer;
