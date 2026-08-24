"use client";

import React, { useEffect, useState } from "react";
import { Loader2, PackageOpen } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { Order } from "@/features/orders/types/order";
import { User } from "@/features/users/types/user";
import OrderRow from "./OrderRow";
import { downloadOrderReceiptPdf } from "@/lib/utils/orderReceiptPdf";
import { useGetOrdersQuery } from "@/store/services/api";
import Pagination from "@/components/ui/pagination";

const PAGE_LIMIT = 5;

type MyOrdersTabProps = {
  profile?: Partial<User> | null;
};

const MyOrdersTab: React.FC<MyOrdersTabProps> = ({ profile }) => {
  const [page, setPage] = useState(1);
  const [isPrintPending, setIsPrintPending] = useState(false);

  const {
    data: cachedOrders,
    isLoading,
    error,
  } = useGetOrdersQuery({ page, limit: PAGE_LIMIT, ownOnly: true });

  const orders = cachedOrders?.orders || [];
  const totalOrders = cachedOrders?.pagination.total || 0;
  const totalPages = Math.max(1, cachedOrders?.pagination.totalPages || 1);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handlePrintInvoice = async (order: Order) => {
    if (isPrintPending) return;
    setIsPrintPending(true);
    try {
      await downloadOrderReceiptPdf(order);
    } finally {
      setIsPrintPending(false);
    }
  };

  return (
    <>
      <div
        className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2"
        aria-busy={isLoading}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-3 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[15px] font-bold text-dark">Order history</h2>
            <p className="mt-0.5 text-[12.5px] text-dark-5">
              Every order you have placed with us
            </p>
          </div>
          <p className="text-[12.5px] text-dark-5">
            <span className="font-semibold text-dark">{orders.length}</span> of{" "}
            <span className="font-semibold text-dark">{totalOrders}</span>
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {isLoading ? (
            <div className="space-y-4" aria-live="polite" role="status">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[168px] w-full animate-pulse rounded-2xl border border-gray-3 bg-gray-1"
                />
              ))}
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border border-red/30 bg-red/10 px-5 py-4 text-[13.5px] text-red"
              role="alert"
            >
              {(error as any)?.data?.message ||
                (error as any)?.data ||
                (error as any)?.error ||
                "Failed to load orders"}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<PackageOpen className="h-7 w-7" />}
              title="No orders yet"
              description="Once you place an order it will appear here, along with its invoice and status."
              action={{ label: "Start shopping", href: "/shop-with-sidebar" }}
            />
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onPrintInvoice={handlePrintInvoice}
                  isPrintPending={isPrintPending}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalOrders}
              itemsPerPage={PAGE_LIMIT}
              onPageChange={setPage}
              showItemsPerPage={false}
            />
          )}
        </div>
      </div>

      {isPrintPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-gray-3 bg-gray-2 px-8 py-7 text-center shadow-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue" />
            <p className="mt-4 text-[14px] font-semibold text-dark">
              Preparing download…
            </p>
            <p className="mt-1 text-[12.5px] text-body">
              Your receipt will download automatically.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default MyOrdersTab;
