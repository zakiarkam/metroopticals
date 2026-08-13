import React from "react";
import Link from "next/link";
import { OutOfStockProduct } from "@/features/dashboard/types/dashboard";

interface OutOfStockCardProps {
  products: OutOfStockProduct[];
  isLoading?: boolean;
}

const OutOfStockCard: React.FC<OutOfStockCardProps> = ({
  products,
  isLoading,
}) => {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const stockBadge = (stock: number) => {
    const isZero = stock === 0;

    return (
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
          "transition shrink-0",
          isZero
            ? "bg-red-light-6 text-red"
            : "bg-yellow-light-4 text-yellow-dark",
        ].join(" ")}
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 4V8M8 10.6667V11.3333"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        {isZero ? "Out of stock" : `${stock} left`}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gray-2 shadow-1 border border-gray-3 overflow-hidden">
        <div className="border-b border-gray-3 px-4 sm:px-5 py-4">
          <div className="h-6 bg-gray-2 rounded w-1/3 mb-2 animate-pulse border border-gray-3" />
          <div className="h-4 bg-gray-2 rounded w-1/2 animate-pulse border border-gray-3" />
        </div>

        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[92px] sm:h-[64px] bg-gray-2 rounded-xl animate-pulse border border-gray-3"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-gray-2 shadow-1 border border-gray-3 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-3 px-4 sm:px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-custom-lg font-semibold text-dark leading-tight">
            Out of Stock Products
          </h3>
          <p className="text-custom-xs sm:text-sm text-body mt-1">
            Products that need restocking
          </p>
        </div>

        <Link
          href="/admin/products?status=OUT_OF_STOCK"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-3 bg-gray-1 px-3.5 py-2 text-custom-xs font-medium text-dark hover:border-blue hover:text-blue hover:bg-gray-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
        >
          View all
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-4">
        {products.length === 0 ? (
          <div className="py-10 text-center text-custom-sm text-body">
            No out of stock products
          </div>
        ) : (
          <>
            {/* md+ header row */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-gray-3 pb-3 text-custom-xs uppercase text-body tracking-wide">
              <span>Product</span>
              <span>Stock</span>
              <span className="text-right">Last Updated</span>
            </div>

            <div className="mt-3 space-y-3 md:space-y-0 md:mt-0">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="
                    rounded-xl md:rounded-none
                    border border-gray-3 md:border-0 md:border-b md:border-gray-2 md:last:border-0
                    bg-gray-2
                    transition
                    hover:bg-gray-1
                    focus-within:bg-gray-1
                  "
                >
                  {/* Mobile card layout */}
                  <div className="md:hidden p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-dark truncate text-sm">
                          {product.title}
                        </p>
                        {product.category ? (
                          <p className="text-[11px] text-body mt-0.5 truncate">
                            {product.category}
                          </p>
                        ) : (
                          <p className="text-[11px] text-body mt-0.5">&nbsp;</p>
                        )}
                      </div>

                      <p className="text-[11px] text-body whitespace-nowrap shrink-0 pt-0.5">
                        {formatDate(product.lastUpdated)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-body">Stock</span>
                      {stockBadge(product.stock)}
                    </div>
                  </div>

                  {/* md+ table layout */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] gap-4 px-0 py-4 text-custom-sm text-dark">
                    <div className="min-w-0">
                      <p className="font-medium text-dark truncate">
                        {product.title}
                      </p>
                      {product.category && (
                        <p className="text-custom-xs text-body mt-1 truncate">
                          {product.category}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center">
                      {stockBadge(product.stock)}
                    </div>

                    <p className="text-custom-xs text-body text-right whitespace-nowrap">
                      {formatDate(product.lastUpdated)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default OutOfStockCard;
