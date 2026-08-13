import SiteContainer from "@/components/common/SiteContainer";
import {
  ProductGridSkeleton,
  ProductListSkeleton,
} from "@/components/common/Loaders/ProductCardSkeleton";

function SidebarSkeleton() {
  return (
    <div className="w-full xl:w-[320px] xl:flex-shrink-0">
      <div className="rounded-xl bg-gray-2 p-5 shadow-sm animate-pulse border border-gray-3">
        {/* Search */}
        <div className="mb-6">
          <div className="h-4 w-16 rounded bg-gray-200 mb-3 border border-gray-3" />
          <div className="h-10 w-full rounded-lg bg-gray-200 border border-gray-3" />
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="h-4 w-20 rounded bg-gray-200 mb-3 border border-gray-3" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gray-200 border border-gray-3" />
                <div className="h-4 flex-1 rounded bg-gray-200 border border-gray-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <div className="h-4 w-24 rounded bg-gray-200 mb-3 border border-gray-3" />
          <div className="flex gap-3">
            <div className="h-10 flex-1 rounded-lg bg-gray-200 border border-gray-3" />
            <div className="h-10 flex-1 rounded-lg bg-gray-200 border border-gray-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="rounded-xl bg-gray-2 shadow-sm px-3 py-3 mb-6 animate-pulse border border-gray-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-32 rounded-lg bg-gray-200 border border-gray-3" />
          <div className="hidden sm:block h-4 w-40 rounded bg-gray-200 border border-gray-3" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-10 rounded bg-gray-200 border border-gray-3" />
          <div className="h-9 w-10 rounded bg-gray-200 border border-gray-3" />
        </div>
      </div>
    </div>
  );
}

export default function ShopSkeleton({
  variant = "grid",
  showSidebar = true,
}: {
  variant?: "grid" | "list";
  showSidebar?: boolean;
}) {
  return (
    <section className="overflow-hidden relative pb-8 pt-4 lg:pt-8 xl:pt-8 bg-gray-1">
      <SiteContainer>
        <div className="flex flex-col gap-6 xl:flex-row">
          {showSidebar && <SidebarSkeleton />}

          <div className="flex-1 w-full">
            <ToolbarSkeleton />

            {variant === "grid" ? (
              <ProductGridSkeleton count={12} columns={3} />
            ) : (
              <ProductListSkeleton count={8} />
            )}

            {/* Pagination skeleton */}
            <div className="flex justify-center mt-10">
              <div className="bg-gray-2 shadow-sm rounded-lg p-2 animate-pulse border border-gray-3">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-9 w-9 rounded bg-gray-200 border border-gray-3" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}

// Inline products loading skeleton (for use within loaded page)
export function ProductsLoadingSkeleton({
  variant = "grid",
  count = 12,
  columns = 3,
}: {
  variant?: "grid" | "list";
  count?: number;
  columns?: 3 | 4;
}) {
  return variant === "grid" ? (
    <ProductGridSkeleton count={count} columns={columns} />
  ) : (
    <ProductListSkeleton count={count} />
  );
}
