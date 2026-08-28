"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logClientError } from "@/lib/client-logger";

/**
 * Something on a storefront page threw. The visitor gets a calm page with a
 * way back, and the error is reported so it can be fixed; they never see a
 * stack trace or Next's default screen.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, { boundary: "site", digest: error.digest });
  }, [error]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-gray-1 px-4 py-20">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
          Something went wrong
        </p>
        <h1 className="mt-3 text-heading-6 font-bold text-dark">
          This page could not be shown
        </h1>
        <p className="mt-3 text-custom-sm text-body">
          It is on our side, not yours. Try again in a moment, or go back to the
          shop — nothing you were doing has been lost.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue px-5 py-2.5 text-custom-sm font-semibold text-white transition hover:bg-blue-dark"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-3 bg-gray-2 px-5 py-2.5 text-custom-sm font-medium text-dark transition hover:bg-gray-3"
          >
            Back to the shop
          </Link>
        </div>
      </div>
    </section>
  );
}
