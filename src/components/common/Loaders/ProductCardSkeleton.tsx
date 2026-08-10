"use client";

interface ProductCardSkeletonProps {
  variant?: "grid" | "list";
}

export default function ProductCardSkeleton({
  variant = "grid",
}: ProductCardSkeletonProps) {
  if (variant === "list") {
    return (
      <div className="flex gap-4 rounded-xl bg-white p-4 shadow-sm animate-pulse">
        {/* Image placeholder */}
        <div className="h-32 w-32 flex-shrink-0 rounded-lg bg-gray-200" />

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between">
          <div className="space-y-2">
            {/* Category */}
            <div className="h-3 w-16 rounded bg-gray-200" />
            {/* Title */}
            <div className="h-5 w-3/4 rounded bg-gray-200" />
            {/* Description */}
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
          </div>

          <div className="mt-3 flex items-center justify-between">
            {/* Price */}
            <div className="h-6 w-20 rounded bg-gray-200" />
            {/* Button */}
            <div className="h-9 w-24 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl bg-white p-3 shadow-sm animate-pulse">
      {/* Image placeholder */}
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-gray-200">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="space-y-2.5">
        {/* Category */}
        <div className="h-3 w-16 rounded bg-gray-200" />

        {/* Title */}
        <div className="h-4 w-3/4 rounded bg-gray-200" />

        {/* Rating */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-4 rounded bg-gray-200" />
          ))}
          <div className="ml-2 h-3 w-8 rounded bg-gray-200" />
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded bg-gray-200" />
          <div className="h-4 w-12 rounded bg-gray-200" />
        </div>

        {/* Button */}
        <div className="h-10 w-full rounded-lg bg-gray-200" />
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
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"
      } gap-x-6 gap-y-8`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant="grid" />
      ))}
    </div>
  );
}

export function ProductListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant="list" />
      ))}
    </div>
  );
}
