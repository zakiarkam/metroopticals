"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store, hydrateFromStorage } from "./store";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateFromStorage();
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
