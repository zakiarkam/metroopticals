import SiteContainer from "@/components/common/SiteContainer";
import {
  ProductGridSkeleton,
  ProductListSkeleton,
} from "@/components/common/Loaders/ProductCardSkeleton";

/** Full-page placeholder for the shop route, mirroring the real layout. */

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-md bg-gray-8 ${className}`} />
);

function SidebarSkeleton() {
  return (
    <div className="w-full xl:w-[300px] xl:flex-shrink-0">
      <div className="flex animate-pulse flex-col gap-4">
        <div className="rounded-2xl border border-gray-3 bg-gray-2 px-4 py-3">
          <Bar className="h-4 w-24" />
        </div>

        <div className="rounded-2xl border border-gray-3 bg-gray-2 p-3">
          <Bar className="h-10 w-full rounded-xl" />
        </div>

        {Array.from({ length: 3 }).map((_, block) => (
          <div
            key={block}
            className="rounded-2xl border border-gray-3 bg-gray-2 p-4"
          >
            <Bar className="mb-4 h-4 w-28" />
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Bar className="h-4 w-4 rounded" />
                  <Bar className="h-3.5 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="mb-6 animate-pulse rounded-2xl border border-gray-3 bg-gray-2 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <Bar className="h-10 w-40 rounded-lg sm:w-52" />
        <div className="flex items-center gap-2">
          <Bar className="hidden h-4 w-32 sm:block" />
          <Bar className="h-10 w-10 rounded-lg" />
          <Bar className="h-10 w-10 rounded-lg" />
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
    <>
      <div className="border-b border-gray-3 bg-gray-2">
        <div className="mx-auto w-full max-w-[1560px] animate-pulse px-4 py-9 sm:px-6 sm:py-11 lg:px-10">
          <Bar className="h-3 w-40" />
          <Bar className="mt-5 h-9 w-72" />
          <Bar className="mt-4 h-4 w-full max-w-xl" />
        </div>
      </div>

      <section className="relative overflow-hidden bg-gray-1 pb-16 pt-8">
        <SiteContainer>
          <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
            {showSidebar && <SidebarSkeleton />}

            <div className="w-full flex-1">
              <ToolbarSkeleton />

              {variant === "grid" ? (
                <ProductGridSkeleton count={12} columns={3} />
              ) : (
                <ProductListSkeleton count={8} />
              )}
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
}

/** Inline products-only skeleton, used while a filter change is in flight. */
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
