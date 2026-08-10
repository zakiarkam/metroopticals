"use client";

import { SessionProvider } from "next-auth/react";
import { ReduxProvider } from "@/store/provider";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { logClientError } from "@/lib/client-logger";

const STORAGE_ALLOWLIST = new Set([
  "metro_cart_v1",
  "metro_wishlist_v1",
  "metro_checkout_draft_v1",
  "user_session",
]);

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const keys = Object.keys(window.localStorage);
      keys.forEach((key) => {
        const isAppCache =
          key.startsWith("metro_") && key.endsWith("_cache_v1");
        if (isAppCache && !STORAGE_ALLOWLIST.has(key)) {
          window.localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clean stale cache keys:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      logClientError(event.error || event.message, {
        type: "window_error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      logClientError(event.reason, { type: "unhandled_rejection" });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ReduxProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#fff",
              color: "#1C2434",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              padding: "16px",
            },
            success: {
              iconTheme: {
                primary: "#10B981",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#EF4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </ReduxProvider>
    </SessionProvider>
  );
}
