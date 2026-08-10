import React from "react";
import { TopProduct } from "@/features/dashboard/types/dashboard";

interface TopProductsCardProps {
  products: TopProduct[];
  isLoading?: boolean;
}

const TopProductsCard: React.FC<TopProductsCardProps> = ({
  products,
  isLoading,
}) => {
  const formatPrice = (price: number) =>
    `Rs ${new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white shadow-1 border border-gray-3 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-3">
          <div className="h-6 bg-gray-2 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-gray-2 rounded w-2/3 mt-2 animate-pulse" />
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[92px] sm:h-[76px] bg-gray-2 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white shadow-1 border border-gray-3 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-3">
        <h3 className="text-base sm:text-custom-lg font-semibold text-dark leading-tight">
          Top Products
        </h3>
        <p className="text-custom-xs sm:text-sm text-body mt-1">
          Best performing products this month
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {products.length === 0 ? (
          <p className="text-center text-custom-sm text-body py-8">
            No product data available
          </p>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="
                  group rounded-xl border border-gray-3 bg-white
                  p-3 sm:p-4
                  transition
                  hover:border-blue hover:bg-gray-1
                  focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/30
                "
              >
                {/* Mobile: stacked / Desktop: row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left */}
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="
                        flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full
                        bg-blue-light-5 text-blue font-semibold text-xs sm:text-sm
                        ring-1 ring-blue/10
                      "
                      aria-label={`Rank ${index + 1}`}
                      title={`Rank ${index + 1}`}
                    >
                      #{index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-dark truncate text-sm sm:text-base">
                        {product.name}
                      </p>
                      {product.category ? (
                        <p className="text-[11px] sm:text-custom-xs text-body mt-0.5 truncate">
                          {product.category}
                        </p>
                      ) : (
                        <p className="text-[11px] sm:text-custom-xs text-body mt-0.5">
                          &nbsp;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center justify-between gap-3 sm:gap-6 pl-10 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] sm:text-custom-xs uppercase tracking-wide text-body">
                        Sold
                      </p>
                      <p className="text-sm sm:text-custom-lg font-semibold text-dark leading-tight">
                        {product.sold}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] sm:text-custom-xs uppercase tracking-wide text-body">
                        Revenue
                      </p>
                      <p className="text-xs sm:text-base font-semibold text-green leading-tight whitespace-nowrap">
                        {formatPrice(product.revenue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TopProductsCard;
