import React from "react";
import Link from "next/link";
import { RecentOrder } from "@/features/dashboard/types/dashboard";

interface RecentOrdersCardProps {
  orders: RecentOrder[];
  isLoading?: boolean;
}

const RecentOrdersCard: React.FC<RecentOrdersCardProps> = ({
  orders,
  isLoading,
}) => {
  const formatPrice = (price: number) =>
    `Rs ${new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING:
        "bg-yellow-light-4 text-yellow-dark border border-yellow-dark/20 hover:bg-yellow-light-3",
      CONFIRMED:
        "bg-blue-light-5 text-blue border border-blue/20 hover:bg-blue-light-4",
      PROCESSING:
        "bg-blue-light-5 text-blue border border-blue/20 hover:bg-blue-light-4",
      SHIPPED:
        "bg-purple-light-5 text-purple border border-purple/20 hover:bg-purple-light-4",
      DELIVERED:
        "bg-green-light-6 text-green border border-green/20 hover:bg-green-light-5",
      CANCELLED:
        "bg-red-light-6 text-red border border-red/20 hover:bg-red-light-5",
    };

    return (
      colors[status] ||
      "bg-gray-2 text-dark-3 border border-gray-3 hover:bg-gray-3"
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
              className="h-20 sm:h-16 bg-gray-2 rounded-xl animate-pulse border border-gray-3"
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
            Recent Orders
          </h3>
          <p className="text-custom-xs sm:text-sm text-body mt-1">
            Latest orders from all channels
          </p>
        </div>

        <Link
          href="/admin/orders"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-gray-3 bg-gray-1 px-3.5 py-2 text-custom-xs font-medium text-dark hover:border-blue hover:text-blue hover:bg-gray-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
        >
          View all
        </Link>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-5 py-4">
        {orders.length === 0 ? (
          <div className="py-10 text-center text-custom-sm text-body">
            No orders yet
          </div>
        ) : (
          <>
            {/* Desktop / Tablet header row */}
            <div className="hidden md:grid grid-cols-[1.5fr_1.4fr_1fr_1fr] gap-4 border-b border-gray-3 pb-3 text-custom-xs uppercase text-body tracking-wide">
              <span>Order</span>
              <span>Customer</span>
              <span>Status</span>
              <span className="text-right">Total</span>
            </div>

            <div className="mt-3 space-y-3 md:space-y-0 md:mt-0">
              {orders.map((order) => (
                <div
                  key={order.id}
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
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-blue truncate text-sm">
                          {order.orderNumber}
                        </p>
                        <p className="text-[11px] text-body mt-0.5">
                          {formatDate(order.date)} ·{" "}
                          {order.channel === "POS" ? "Walk-in" : "Website"}
                        </p>
                      </div>
                      <p className="font-semibold text-dark whitespace-nowrap shrink-0 text-sm">
                        {formatPrice(order.total)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-body shrink-0 pt-0.5">
                          Customer
                        </span>
                        <span className="text-xs text-dark text-right break-words max-w-[60%]">
                          {order.customer}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-body shrink-0">
                          Status
                        </span>
                        <Link
                          href={`/admin/orders`}
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize transition items-center gap-1 group min-h-[22px] shrink-0 ${getStatusColor(
                            order.status
                          )} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40`}
                          title="View order details"
                        >
                          <span>{order.status.toLowerCase()}</span>
                          <svg
                            className="h-3 w-3 transition group-hover:translate-x-0.5"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M6 4L10 8L6 12"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* md+ table layout */}
                  <div className="hidden md:grid grid-cols-[1.5fr_1.4fr_1fr_1fr] gap-4 px-0 py-4 text-custom-sm text-dark">
                    <div className="px-0">
                      <p className="font-semibold text-blue">
                        {order.orderNumber}
                      </p>
                      <p className="text-custom-xs text-body mt-1">
                        {formatDate(order.date)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          order.channel === "POS"
                            ? "border-blue/20 bg-blue-light-5 text-blue"
                            : "border-gray-3 bg-gray-1 text-body"
                        }`}
                      >
                        {order.channel === "POS" ? "Walk-in" : "Website"}
                      </span>
                    </div>

                    <p className="truncate pr-2">{order.customer}</p>

                    <div className="flex items-center">
                      <Link
                        href={`/admin/orders`}
                        className={`inline-flex rounded-full px-2.5 py-1 text-custom-xs font-medium capitalize transition items-center gap-1 group min-h-[26px] ${getStatusColor(
                          order.status
                        )} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40`}
                        title="View order details"
                      >
                        <span>{order.status.toLowerCase()}</span>
                        <svg
                          className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M6 4L10 8L6 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Link>
                    </div>

                    <p className="font-semibold text-right">
                      {formatPrice(order.total)}
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

export default RecentOrdersCard;
