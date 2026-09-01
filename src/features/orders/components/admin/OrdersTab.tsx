"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/ui/pagination";
import { getOrderById } from "@/features/orders/api/orders-api";
import { Order, OrderStatus } from "@/features/orders/types/order";
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/features/users/types/user";
import OrderDetailDialog from "./modals/OrderDetailDialog";
import OrderStatusDialog from "./modals/OrderStatusDialog";
import { downloadOrderReceiptPdf } from "@/lib/utils/orderReceiptPdf";
import { Toast } from "@/lib/utils/toast";
import { useGetOrdersQuery } from "@/store/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  orderCustomerEmail,
  orderCustomerName,
} from "@/features/orders/utils/order-display";

type OrdersTabProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateRange: string;
};

const OrdersTab: React.FC<OrdersTabProps> = ({
  searchTerm,
  setSearchTerm,
  dateRange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [channelFilter, setChannelFilter] = useState<"ALL" | "ONLINE" | "POS">(
    "ALL",
  );
  const router = useRouter();
  const loadingToastIdRef = useRef<string | number | null>(null);

  const queryParams = useMemo(
    () => ({
      search: searchTerm,
      page: currentPage,
      limit,
      status: statusFilter === "all" ? undefined : statusFilter,
      channel: channelFilter,
    }),
    [searchTerm, currentPage, limit, statusFilter, channelFilter]
  );

  const {
    data: cachedOrders,
    isLoading,
    error,
    refetch: refetchOrders,
  } = useGetOrdersQuery(queryParams, { pollingInterval: 30000 });

  const orders = useMemo(() => cachedOrders?.orders || [], [cachedOrders]);
  const totalPages = cachedOrders?.pagination.totalPages || 1;
  const totalOrders = cachedOrders?.pagination.total || 0;

  // Debounce search input for smoother UX
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearchTerm, setSearchTerm]);

  useEffect(() => {
    if (!error) return;
    const message =
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      "Failed to load orders";
    Toast.error(message);
  }, [error]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDetailDialogOpen(true);
  };

  const handleStatusClick = (order: Order) => {
    setSelectedOrder(order);
    setIsStatusDialogOpen(true);
  };

  const handleOrdersChanged = useCallback(() => {
    refetchOrders();
  }, [refetchOrders]);

  const formatPrice = (price: number) => {
    return `Rs ${new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
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
    return colors[status];
  };

  const summary = useMemo(
    () => [
      {
        label: "Orders placed",
        value: "1,248",
        helper: "+8.6% vs prior",
        badge: "bg-blue-light-5 text-blue",
      },
      {
        label: "Average order value",
        value: "Rs 142.30",
        helper: "+Rs 6.10 uplift",
        badge: "bg-green-light-6 text-green",
      },
      {
        label: "Fulfilled within SLA",
        value: "94%",
        helper: "+3.2 pts",
        badge: "bg-yellow-light-4 text-yellow-dark",
      },
      {
        label: "Refunds processed",
        value: "28",
        helper: "-11 vs prior",
        badge: "bg-red-light-6 text-red",
      },
    ],
    []
  );

  const rangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7":
        return "last 7 days";
      case "30":
        return "last 30 days";
      case "90":
        return "last 90 days";
      default:
        return "last 12 months";
    }
  }, [dateRange]);

  const handlePrintOrder = async (orderId: number) => {
    try {
      if (isGeneratingReceipt) return;

      // A counter bill has payments and possibly a balance, which the website
      // invoice has no place for  it prints from the POS receipt instead.
      const order = orders.find((row) => row.id === orderId);
      if (order?.channel === "POS") {
        router.push(`/admin/pos/receipt/${orderId}`);
        return;
      }

      setIsGeneratingReceipt(true);
      loadingToastIdRef.current = Toast.loading("Generating receipt...");

      // Fetch full order details
      const fullOrder = await getOrderById(orderId);
      await downloadOrderReceiptPdf(fullOrder);

      Toast.success("Receipt downloaded.");
      setIsGeneratingReceipt(false);
      if (loadingToastIdRef.current) {
        Toast.dismiss(loadingToastIdRef.current);
        loadingToastIdRef.current = null;
      }
    } catch (error: any) {
      console.error("Failed to fetch order for printing:", error);

      Toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch order details"
      );

      setIsGeneratingReceipt(false);
      if (loadingToastIdRef.current) {
        Toast.dismiss(loadingToastIdRef.current);
        loadingToastIdRef.current = null;
      }
    }
  };

  // The search and the status filter are both part of the query, so the rows
  // that came back are already the rows to show. Filtering them again here
  // would only search the page in front of us and quietly drop matches that
  // are sitting on page two.

  return (
    <div className="space-y-7.5">
      <div className="grid gap-7.5">
        <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
            <div>
              <h3 className="text-custom-lg font-semibold text-dark">
                All Orders
              </h3>
              <p className="text-custom-xs text-body">
                {totalOrders} total orders
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  className="h-8 w-64 rounded-lg border border-gray-3 bg-gray-1 pl-10 pr-4 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Where the sale came from: the website, or the shop counter. */}
              <div className="flex h-8 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
                {(
                  [
                    ["ALL", "All sales"],
                    ["ONLINE", "Website"],
                    ["POS", "Walk-in"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => {
                      setChannelFilter(value);
                      setCurrentPage(1);
                    }}
                    className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                      channelFilter === value
                        ? "bg-gray-2 text-blue shadow-1"
                        : "text-body hover:text-dark"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Status Filter - Desktop (Toggle Buttons) */}
              <div className="hidden lg:flex h-8 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
                {(
                  [
                    "all",
                    "PENDING",
                    "CONFIRMED",
                    "PROCESSING",
                    "SHIPPED",
                    "DELIVERED",
                    "CANCELLED",
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter}
                    onClick={() =>
                      setStatusFilter(filter === "all" ? "all" : filter)
                    }
                    className={`h-7 rounded-full px-3 text-custom-xs font-medium transition whitespace-nowrap ${
                      statusFilter === filter
                        ? "bg-gray-2 text-blue shadow-1"
                        : "text-body hover:text-dark"
                    }`}
                  >
                    {filter === "all"
                      ? "All"
                      : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Status Filter - Mobile (Select Dropdown) */}
              <div className="lg:hidden w-[180px]">
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as typeof statusFilter)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[150px_200px_1fr_150px_120px_120px_100px] gap-4 border-b border-gray-3 px-4 sm:px-5 py-3 text-custom-xs uppercase text-body tracking-wide">
                <span>Order #</span>
                <span>Customer</span>
                <span>Items</span>
                <span>Date</span>
                <span>Total</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {isLoading ? (
                <div className="px-4 sm:px-5 py-10 text-center text-custom-sm text-body">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="px-4 sm:px-5 py-10 text-center text-custom-sm text-body">
                  No orders found.
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-[150px_200px_1fr_150px_120px_120px_100px] gap-4 px-4 sm:px-5 py-4 text-custom-sm border-b border-gray-2 last:border-0 hover:bg-gray-1 transition items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-custom-xs text-blue truncate">
                        {order.orderNumber}
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
                    <div className="min-w-0">
                      <p className="font-medium text-dark truncate">
                        {orderCustomerName(order)}
                      </p>
                      <p className="text-custom-xs text-body truncate">
                        {orderCustomerEmail(order) || order.billingPhone}
                      </p>
                      {order.user?.customerType && (
                        <p className="text-[10px] text-blue font-medium truncate mt-0.5">
                          {CUSTOMER_TYPE_LABELS[order.user.customerType as CustomerType] || order.user.customerType}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-custom-xs text-body truncate">
                        {order.items.length} item
                        {order.items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-custom-xs text-body truncate">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-dark truncate">
                        {formatPrice(order.totalAmount)}
                      </p>
                      {/* Whether the money is actually in, for the orders
                          where that is not obvious from the status. A card
                          order that says PENDING here has not been paid for
                          and must not be picked and packed. */}
                      {order.paymentMethod === "payhere" && (
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            order.paymentStatus === "PAID"
                              ? "border-green/25 bg-green/10 text-green"
                              : "border-orange/25 bg-orange/10 text-orange"
                          }`}
                        >
                          {order.paymentStatus === "PAID"
                            ? "Card paid"
                            : "Awaiting payment"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex items-center">
                      {/* Status Button - Clickable to change */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusClick(order)}
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-custom-xs font-medium capitalize transition items-center gap-1 group min-h-[24px] border-0 ${getStatusColor(
                          order.status
                        )}`}
                        title="Click to change status"
                      >
                        <span>{order.status.toLowerCase()}</span>
                        <svg
                          className="h-3 w-3 transition"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(order.id)}
                        className="h-8 w-8 text-blue hover:text-blue-dark hover:bg-blue-50 transition"
                        title="View Details"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M10 4.16667C5.83333 4.16667 2.27499 6.73333 0.833328 10.4167C2.27499 14.1 5.83333 16.6667 10 16.6667C14.1667 16.6667 17.725 14.1 19.1667 10.4167C17.725 6.73333 14.1667 4.16667 10 4.16667Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 13.3333C11.841 13.3333 13.3333 11.841 13.3333 10C13.3333 8.15905 11.841 6.66667 10 6.66667C8.15905 6.66667 6.66667 8.15905 6.66667 10C6.66667 11.841 8.15905 13.3333 10 13.3333Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintOrder(order.id)}
                        disabled={isGeneratingReceipt}
                        className="h-8 w-8 text-green hover:text-green-dark hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Receipt"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M5 7V3C5 2.73478 5.10536 2.48043 5.29289 2.29289C5.48043 2.10536 5.73478 2 6 2H14C14.2652 2 14.5196 2.10536 14.7071 2.29289C14.8946 2.48043 15 2.73478 15 3V7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 13H3C2.73478 13 2.48043 12.8946 2.29289 12.7071C2.10536 12.5196 2 12.2652 2 12V9C2 8.73478 2.10536 8.48043 2.29289 8.29289C2.48043 8.10536 2.73478 8 3 8H17C17.2652 8 17.5196 8.10536 17.7071 8.29289C17.8946 8.48043 18 8.73478 18 9V12C18 12.2652 17.8946 12.5196 17.7071 12.7071C17.5196 12.8946 17.2652 13 17 13H15"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M15 11H5V17C5 17.2652 5.10536 17.5196 5.29289 17.7071C5.48043 17.8946 5.73478 18 6 18H14C14.2652 18 14.5196 17.8946 14.7071 17.7071C14.8946 17.5196 15 17.2652 15 17V11Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {!isLoading && orders.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalOrders}
              itemsPerPage={limit}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleLimitChange}
              showItemsPerPage={true}
              itemsPerPageOptions={[6, 12, 24, 48, 96]}
            />
          )}
        </div>
      </div>

      <OrderDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
      />

      <OrderStatusDialog
        isOpen={isStatusDialogOpen}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setSelectedOrder(null);
        }}
        onSuccess={handleOrdersChanged}
        orderId={selectedOrder?.id || null}
        orderNumber={selectedOrder?.orderNumber || ""}
        currentStatus={selectedOrder?.status || "PENDING"}
      />

      {/* Loading Overlay */}
      {isGeneratingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-gray-2 p-8 shadow-xl border border-gray-3">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent"></div>
              <p className="mt-4 text-lg font-semibold text-dark">
                Generating Receipt...
              </p>
              <p className="mt-2 text-sm text-body">
                Please wait while we prepare your receipt
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
