"use client";

/**
 * Loading placeholders shaped like the real cards.
 *
 * The proportions here (4:3 media plate, two text lines, full-width button)
 * mirror both <ProductCard /> layouts so the grid does not jump
 * when data lands.
 */

interface ProductCardSkeletonProps {
  variant?: "grid" | "list";
}

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-md bg-gray-8 ${className}`} />
);

export default function ProductCardSkeleton({
  variant = "grid",
}: ProductCardSkeletonProps) {
  if (variant === "list") {
    return (
      <div className="flex animate-pulse flex-col gap-5 rounded-2xl border border-gray-3 bg-gray-2 p-4 sm:flex-row sm:p-5">
        <div className="aspect-[4/3] w-full shrink-0 rounded-xl bg-gray-8 sm:aspect-square sm:w-[190px]" />

        <div className="flex flex-1 flex-col gap-3">
          <Bar className="h-2.5 w-24" />
          <Bar className="h-5 w-3/5" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-4/5" />
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-gray-3 pt-4">
            <Bar className="h-6 w-28" />
            <Bar className="h-11 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-8">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-3 p-5">
        <Bar className="h-2.5 w-20" />
        <Bar className="h-4 w-4/5" />
        <Bar className="h-3 w-full" />
        <Bar className="h-6 w-28" />
        <Bar className="mt-1 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 12,
  columns = 4,
}: {
  count?: number;
  columns?: 3 | 4;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 ${
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant="grid" />
      ))}
    </div>
  );
}

export function ProductListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant="list" />
      ))}
    </div>
  );
}
