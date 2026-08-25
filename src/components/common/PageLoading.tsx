import React from "react";
import InlineSpinner from "./InlineSpinner";

/**
 * The route-level loading state.
 *
 * Four different spinners were in use across the storefront  a hand-rolled
 * `border-b-2` ring on two route files, `<Loader2>` in three components and
 * `<InlineSpinner>` in two more  so the same wait looked different depending
 * on where you were. Route-level waits use this one.
 */
export default function PageLoading({
  className = "min-h-[60vh]",
}: {
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <InlineSpinner size={34} />
      <span className="sr-only">Loading</span>
    </div>
  );
}
