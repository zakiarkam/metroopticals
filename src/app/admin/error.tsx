"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logClientError } from "@/lib/client-logger";

/**
 * A back-office screen threw.
 *
 * Without this the nearest boundary is the root one, which replaces the whole
 * document with a bare "something went wrong" page - no sidebar, no way back
 * to the till, and nothing to say which screen failed. Staff are usually
 * mid-sale when this happens, so the recovery has to keep them inside the
 * admin.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logClientError(error, { boundary: "admin", digest: error.digest });
  }, [error]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-20">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
          Something went wrong
        </p>
        <h1 className="mt-3 text-heading-6 font-bold text-dark">
          This screen could not be shown
        </h1>
        <p className="mt-3 text-custom-sm text-body">
          Nothing you had saved is affected. Try again, or go back to the till
          and carry on.
        </p>
        {error.digest ? (
          <p className="mt-3 text-custom-xs text-body">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue px-5 py-2.5 text-custom-sm font-semibold text-white transition hover:bg-blue-dark"
          >
            Try again
          </button>
          <Link
            href="/admin/pos"
            className="rounded-lg border border-gray-3 bg-gray-2 px-5 py-2.5 text-custom-sm font-medium text-dark transition hover:bg-gray-3"
          >
            Back to the till
          </Link>
        </div>
      </div>
    </section>
  );
}
