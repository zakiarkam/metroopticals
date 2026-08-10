"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

const formatMemberSince = (date?: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
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

  const memberSince = useMemo(
    () => formatMemberSince(profile?.createdAt),
    [profile?.createdAt]
  );

  const location = useMemo(() => {
    const parts = [
      profile?.address,
      profile?.city,
      profile?.postalCode,
      profile?.country,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "Not provided";
  }, [profile?.address, profile?.city, profile?.country, profile?.postalCode]);

  return (
    <div className="">
      <div
        className="bg-white rounded-xl shadow-1 p-6 space-y-5"
        aria-busy={isLoading}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-custom-xs text-body">My Orders</p>
            <p className="text-dark text-lg font-semibold">Order history</p>
          </div>
          <div className="text-right text-custom-xs text-dark-2">
            <p>Total orders: {totalOrders}</p>
            <p>
              Showing {orders.length} of {totalOrders}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4" aria-live="polite" role="status">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-xl bg-gray-1 border border-gray-3"
              />
            ))}
          </div>
        ) : error ? (
          <p className="py-10 text-center text-custom-sm text-red" role="alert">
            {(error as any)?.data?.message ||
              (error as any)?.data ||
              (error as any)?.error ||
              "Failed to load orders"}
          </p>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-custom-sm text-body">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center justify-center rounded-full border border-blue px-5 py-2 text-custom-sm font-semibold text-blue hover:bg-blue hover:text-white"
            >
              Continue shopping
            </Link>
          </div>
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

      {isPrintPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent"></div>
              <p className="mt-3 text-sm font-semibold text-dark">
                Preparing download...
              </p>
              <p className="mt-1 text-xs text-body">
                Your receipt will download automatically
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersTab;
