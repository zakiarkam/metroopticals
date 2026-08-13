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
              background: "#17171A",
              color: "#F5F1E8",
              borderRadius: "10px",
              border: "1px solid #2E2E33",
              padding: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            },
            success: {
              iconTheme: {
                primary: "#34C77B",
                secondary: "#17171A",
              },
            },
            error: {
              iconTheme: {
                primary: "#F65454",
                secondary: "#17171A",
              },
            },
            loading: {
              iconTheme: {
                primary: "#C09C6C",
                secondary: "#17171A",
              },
            },
          }}
        />
      </ReduxProvider>
    </SessionProvider>
  );
}
