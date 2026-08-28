"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/client-logger";

/**
 * The last resort: the root layout itself failed. This renders its own
 * <html> because nothing else is left standing. Plain styles on purpose 
 * Tailwind may be part of what broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, { boundary: "global", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#FAF8F4",
          color: "#1B1713",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ color: "#8F6A37", fontSize: 12, letterSpacing: "0.18em", fontWeight: 700 }}>
            METRO OPTICALS
          </p>
          <h1 style={{ fontSize: 24, margin: "12px 0" }}>Something went wrong</h1>
          <p style={{ color: "#6F6555", maxWidth: 420 }}>
            The site hit a problem it could not recover from. Please try again in
            a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#8F6A37",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
