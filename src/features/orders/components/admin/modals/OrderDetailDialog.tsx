"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getOrderById } from "@/features/orders/api/orders-api";
import { Order } from "@/features/orders/types/order";
import Image from "next/image";
import { Toast } from "@/lib/utils/toast";
import { getProductImageUrl } from "@/lib/storageUtils";
import { Printer, X } from "lucide-react";
import { downloadOrderReceiptPdf } from "@/lib/utils/orderReceiptPdf";

interface OrderDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
}

const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({
  isOpen,
  onClose,
  orderId,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const loadingToastIdRef = useRef<string | number | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      console.error("Failed to load order:", err);

      Toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load order details",
      );

      onCloseRef.current();
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) loadOrder();
  }, [isOpen, orderId, loadOrder]);

  const formatPrice = (price: number) =>
    `Rs ${new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusPill = useMemo(() => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-light-4 text-yellow-dark",
      CONFIRMED: "bg-blue-light-5 text-blue",
      PROCESSING: "bg-blue-light-5 text-blue",
      SHIPPED: "bg-purple-light-5 text-purple",
      DELIVERED: "bg-green-light-6 text-green",
      CANCELLED: "bg-red-light-6 text-red",
    };
    return (status: string) => colors[status] || "bg-gray-2 text-dark-3";
  }, []);

  const resolveImage = (
    images?: string[] | { previews?: string[]; thumbnails?: string[] },
  ) => {
    if (!images) return null;

    const flatList: string[] = [];
    if (Array.isArray(images)) {
      flatList.push(...images);
    } else {
      if (images.previews?.length) flatList.push(...images.previews);
      if (images.thumbnails?.length) flatList.push(...images.thumbnails);
    }

    const resolved = flatList
      .map((value) => getProductImageUrl(value))
      .find(Boolean);

    return resolved || null;
  };

  const handlePrintClick = () => {
    if (!order) return;

    setIsGeneratingReceipt(true);
    loadingToastIdRef.current = Toast.loading("Generating receipt...");
    Promise.resolve()
      .then(() => downloadOrderReceiptPdf(order))
      .then(() => {
        Toast.success("Receipt downloaded.");
      })
      .catch((error) => {
        console.error("Receipt download error:", error);
        Toast.error("Failed to generate receipt. Please try again.");
      })
      .finally(() => {
        setIsGeneratingReceipt(false);
        if (loadingToastIdRef.current) {
          Toast.dismiss(loadingToastIdRef.current);
          loadingToastIdRef.current = null;
        }
      });
  };

  const Field = ({
    label,
    value,
    className = "",
  }: {
    label: string;
    value: React.ReactNode;
    className?: string;
  }) => (
    <div className={`space-y-1 ${className}`}>
      <p className="text-[11px] text-body uppercase tracking-wide">{label}</p>
      <div className="text-xs md:text-sm text-dark font-medium leading-snug">
        {value}
      </div>
    </div>
  );

  const Section = ({
    title,
    children,
    right,
  }: {
    title: string;
    children: React.ReactNode;
    right?: React.ReactNode;
  }) => (
    <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm overflow-hidden">
      <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-2 flex items-center justify-between gap-3">
        <h4 className="text-sm md:text-base font-semibold text-dark">
          {title}
        </h4>
        {right}
      </div>
      <div className="px-3 py-2 md:px-4 md:py-3">{children}</div>
    </section>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header (compact + responsive controls) */}
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3">
          <div className="px-3 py-2 md:px-4 md:py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg font-semibold leading-tight">
                  Order Details
                </DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-body mt-1">
                  View complete information about this order
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {order && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrintClick}
                    disabled={isGeneratingReceipt}
                    className="h-8"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Download receipt
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-9 rounded-lg"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-3 py-2 md:px-4 md:py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-14">
              <div className="text-center">
                <div className="inline-block h-8 w-9 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent" />
                <p className="mt-3 text-xs md:text-sm text-body">
                  Loading order details...
                </p>
              </div>
            </div>
          ) : order ? (
            <div className="space-y-4">
              {/* Summary header card */}
              <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm px-3 py-2 md:px-4 md:py-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-semibold text-dark">
                      Order #{order.orderNumber}
                    </h3>
                    <p className="text-xs md:text-sm text-body mt-1">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPill(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer + Billing (responsive stacked) */}
              <div className="grid gap-4 md:grid-cols-2">
                <Section title="Customer">
                  <div className="grid gap-3">
                    <Field label="Name" value={order.user.name} />
                    <Field label="Email" value={order.user.email} />
                  </div>
                </Section>

                <Section title="Billing">
                  <div className="grid gap-3">
                    <Field label="Name" value={order.billingName} />
                    <Field label="Email" value={order.billingEmail} />
                    <Field label="Phone" value={order.billingPhone} />
                  </div>
                </Section>
              </div>

              {/* Shipping */}
              <Section title="Shipping">
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <Field
                    label="Address"
                    value={order.shippingAddress}
                    className="md:col-span-2"
                  />
                  <Field label="City" value={order.shippingCity} />
                  <Field label="Country" value={order.shippingCountry} />
                  <Field label="Phone" value={order.shippingPhone} />
                  {order.shippingPostalCode && (
                    <Field
                      label="Postal Code"
                      value={order.shippingPostalCode}
                    />
                  )}
                </div>
              </Section>

              {/* Items (scroll-safe on mobile) */}
              <Section
                title="Order Items"
                right={
                  <span className="text-xs text-body">
                    {order.items.length} item{order.items.length > 1 ? "s" : ""}
                  </span>
                }
              >
                <div className="space-y-3">
                  {order.items.map((item) => {
                    const imageSrc = resolveImage(item.product?.images);
                    const lineTotal =
                      (item.discountedPrice || item.price) * item.quantity;

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-gray-3 bg-gray-2 p-3 md:p-4"
                      >
                        <div className="flex gap-3 md:gap-4">
                          <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-lg border border-gray-3 bg-gray-2">
                            {imageSrc ? (
                              <Image
                                src={imageSrc}
                                alt={item.product.title}
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <svg
                                  className="h-8 w-8 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-sm md:text-base font-semibold text-dark leading-tight">
                                    {item.product.title}
                                  </h5>
                                  <p className="text-xs md:text-sm text-body mt-1">
                                    {item.product.category.name}
                                    {item.color ? ` · ${item.color}` : ""}
                                  </p>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="text-sm md:text-base font-semibold text-dark whitespace-nowrap">
                                    {formatPrice(lineTotal)}
                                  </p>
                                  {item.discountedPrice && (
                                    <p className="text-[11px] md:text-xs text-body line-through mt-0.5">
                                      {formatPrice(item.price * item.quantity)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-gray-1 px-3 py-1 text-xs font-medium text-dark">
                                  Qty: {item.quantity}
                                </span>

                                {item.discountedPrice && (
                                  <span className="inline-flex items-center rounded-full bg-red-light-6 px-3 py-1 text-xs font-semibold text-red">
                                    Discounted
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* Summary */}
              <Section title="Summary">
                <div className="max-w-md md:ml-auto space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs md:text-sm text-body">
                      Subtotal
                    </span>
                    <span className="text-xs md:text-sm font-semibold text-dark">
                      {formatPrice(order.subtotal)}
                    </span>
                  </div>
                  <div className="h-px bg-gray-2 my-2" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm md:text-base font-semibold text-dark">
                      Total
                    </span>
                    <span className="text-sm md:text-base font-bold text-blue">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </Section>

              {/* Notes */}
              {order.notes && (
                <Section title="Order Notes">
                  <p className="text-xs md:text-sm text-body leading-relaxed whitespace-pre-wrap">
                    {order.notes}
                  </p>
                </Section>
              )}
            </div>
          ) : null}
        </div>

        {/* Generating Overlay (compact + mobile friendly) */}
        {isGeneratingReceipt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-gray-2 shadow-xl border border-gray-3">
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark">
                      Generating receipt…
                    </p>
                    <p className="text-xs text-body">
                      Please wait while we prepare your receipt
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      Toast.info("Receipt generation in progress…");
                    }}
                  >
                    Ok
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
