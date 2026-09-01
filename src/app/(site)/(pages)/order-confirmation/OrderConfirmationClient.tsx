"use client";

import toast from "react-hot-toast";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Mail,
  PackageCheck,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import EmptyState from "@/components/common/EmptyState";
import axiosInstance from "@/lib/axiosInstance";
import {
  createPayHereSession,
  submitPayHereCheckout,
} from "@/features/checkout/api/payhere-api";
import { ONLINE_PAYMENT_FEE_LABEL } from "@/features/checkout/utils/payment-fee";
import { downloadOrderReceiptPdf } from "@/lib/utils/orderReceiptPdf";
import { formatPrice } from "@/lib/utils/price";

/** What happens next  the three things customers email to ask about. */
const NEXT_STEPS = [
  {
    icon: Mail,
    title: "Confirmation email",
    copy: "A copy of this receipt is on its way to your inbox.",
  },
  {
    icon: PackageCheck,
    title: "Lenses cut & fitted",
    copy: "We check your prescription, then glaze and edge the lenses.",
  },
  {
    icon: Truck,
    title: "Collect or delivered",
    copy: "We'll message you the moment your order is ready to go.",
  },
];

/**
 * How long to wait for the gateway's callback before telling the customer to
 * stop watching the page.
 *
 * The callback is server to server, so it usually lands before the customer's
 * browser finishes coming back — but it is a separate network path, and a
 * slow one is not a failed payment. Nothing here decides whether the order is
 * paid: the page only reads what the callback already wrote.
 */
const CONFIRM_POLL_MS = 2500;
const CONFIRM_POLL_ATTEMPTS = 12;

const OrderConfirmationClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  /** `return` and `cancelled` are how PayHere sends the customer back. */
  const paymentOutcome = searchParams.get("payment");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  /** Set only when the request itself failed, as opposed to a real 404. */
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPrintPending, setIsPrintPending] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(
    paymentOutcome === "return",
  );
  const pollsLeft = useRef(CONFIRM_POLL_ATTEMPTS);

  const fetchOrder = useCallback(async () => {
    const response = await axiosInstance.get(`/orders/${orderId}`);
    return response.data?.order ?? response.data?.data?.order ?? null;
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      router.push("/");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const orderData = await fetchOrder();
        if (!cancelled) setOrder(orderData);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, router, fetchOrder]);

  // Come back from the gateway and the callback may still be in flight, so
  // the page re-reads the order a few times rather than declaring a payment
  // failed the instant it lands.
  useEffect(() => {
    if (!awaitingPayment || !order) return;

    if (order.paymentStatus === "PAID" || order.status === "CANCELLED") {
      setAwaitingPayment(false);
      return;
    }

    if (pollsLeft.current <= 0) {
      setAwaitingPayment(false);
      return;
    }

    const timer = setTimeout(async () => {
      pollsLeft.current -= 1;
      try {
        const fresh = await fetchOrder();
        if (fresh) setOrder(fresh);
      } catch {
        // A dropped poll is not a failed payment; the next tick tries again.
      }
    }, CONFIRM_POLL_MS);

    return () => clearTimeout(timer);
  }, [awaitingPayment, order, fetchOrder]);

  const handleDownloadInvoice = async () => {
    if (!order || isPrintPending) return;

    setIsPrintPending(true);
    try {
      await downloadOrderReceiptPdf(order);
    } catch {
      toast.error("Could not generate the invoice. Please try again.");
    } finally {
      setIsPrintPending(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!order || isRetryingPayment) return;
    setIsRetryingPayment(true);
    try {
      const checkout = await createPayHereSession(order.id);
      submitPayHereCheckout(checkout);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't reopen the payment page. Please try again.",
      );
      setIsRetryingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue" />
      </div>
    );
  }

  if (!order) {
    return (
      <section className="bg-gray-1 py-16">
        <SiteContainer>
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title={
              loadFailed ? "We couldn't load your order" : "Order not found"
            }
            description={
              loadFailed
                ? "Your order was not affected  we just could not reach the server. Try again in a moment."
                : "We couldn't find that order. If you have just checked out, give it a moment and refresh."
            }
            action={
              loadFailed
                ? {
                    label: "Try again",
                    onClick: () => window.location.reload(),
                  }
                : { label: "Go to my orders", href: "/my-account/orders" }
            }
          />
        </SiteContainer>
      </section>
    );
  }

  const isCardOrder = order.paymentMethod === "payhere";
  const isPaid = order.paymentStatus === "PAID";
  const isCancelled = order.status === "CANCELLED";
  const isPickup = order.shippingMethod === "pickup";
  const canRetryPayment = isCardOrder && !isPaid && !isCancelled;

  /** One of four states, so the page never says "order placed" over a failure. */
  const state: "confirming" | "paid" | "unpaid" | "placed" = awaitingPayment
    ? "confirming"
    : isCardOrder && isPaid
      ? "paid"
      : canRetryPayment || isCancelled
        ? "unpaid"
        : "placed";

  const HEADINGS = {
    confirming: {
      icon: Loader2,
      tone: "text-blue border-blue/30 bg-blue/10",
      spin: true,
      title: "Confirming your payment",
      copy: "Hold on a moment — we're waiting for the payment to be confirmed. This page updates itself.",
    },
    paid: {
      icon: CheckCircle2,
      tone: "text-green border-green/30 bg-green/10",
      spin: false,
      title: "Payment received",
      copy: "Thank you — your payment went through and your order is confirmed. Our team will be in touch about your prescription within one working day.",
    },
    unpaid: {
      icon: AlertTriangle,
      tone: "text-orange border-orange/30 bg-orange/10",
      spin: false,
      title: isCancelled ? "Order cancelled" : "Payment not completed",
      copy: isCancelled
        ? "This order was cancelled because the payment did not go through. Your basket is still waiting for you — nothing was charged."
        : "We haven't received the payment for this order yet. Nothing has been charged. You can try again below, or pay another way.",
    },
    placed: {
      icon: CheckCircle2,
      tone: "text-green border-green/30 bg-green/10",
      spin: false,
      title: "Order placed",
      copy: "Thanks — we have it. Our team will be in touch about your prescription within one working day.",
    },
  } as const;

  const heading = HEADINGS[state];
  const HeadingIcon = heading.icon;

  return (
    <section className="relative overflow-hidden bg-gray-1 py-12 lg:py-20">
      {/* soft gold bloom behind the confirmation card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, rgba(192,156,108,0.16) 0%, transparent 70%)",
        }}
      />

      <SiteContainer className="relative">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-gray-3 bg-gray-2 shadow-3">
            {/* ---------------------- header ---------------------- */}
            <div className="border-b border-gray-3 px-6 py-10 text-center sm:px-10">
              <span
                className={`mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border ${heading.tone}`}
              >
                <HeadingIcon
                  className={`h-8 w-8 ${heading.spin ? "animate-spin" : ""}`}
                />
              </span>

              <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-dark sm:text-[2.1rem]">
                {heading.title}
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-body">
                {heading.copy}
              </p>

              <div className="mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-gray-3 bg-gray-1 px-5 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-dark-5">
                  Order
                </span>
                <span className="break-all text-[14px] font-bold text-blue">
                  {order.orderNumber}
                </span>
              </div>

              {canRetryPayment && !awaitingPayment && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    disabled={isRetryingPayment}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-wait disabled:opacity-70"
                  >
                    {isRetryingPayment ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <RefreshCw className="h-[18px] w-[18px]" />
                    )}
                    Try the payment again
                  </button>
                  <p className="mt-2.5 text-[12px] text-dark-5">
                    Prefer another way? Call us on the number in your email and
                    we&apos;ll switch it to cash or bank transfer.
                  </p>
                </div>
              )}
            </div>

            {/* ---------------------- totals ---------------------- */}
            <div className="border-b border-gray-3 px-6 py-7 sm:px-10">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-dark">
                Summary
              </h2>

              <dl className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-[14px]">
                  <dt className="text-dark-4">Subtotal</dt>
                  <dd className="font-semibold text-dark">
                    {formatPrice(order.subtotal)}
                  </dd>
                </div>

                <div className="flex items-center justify-between text-[14px]">
                  <dt className="flex items-center gap-1.5 text-dark-4">
                    {isPickup ? (
                      <Store className="h-4 w-4" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                    {isPickup ? "Store collection" : "Island-wide delivery"}
                  </dt>
                  <dd className="font-semibold text-green">
                    {order.shippingFee > 0
                      ? formatPrice(order.shippingFee)
                      : "Free"}
                  </dd>
                </div>

                {order.paymentFee > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <dt className="flex items-center gap-1.5 text-dark-4">
                      <CreditCard className="h-4 w-4" />
                      {ONLINE_PAYMENT_FEE_LABEL}
                    </dt>
                    <dd className="font-semibold text-dark">
                      {formatPrice(order.paymentFee)}
                    </dd>
                  </div>
                )}

                <div className="flex items-baseline justify-between rounded-xl border border-blue/25 bg-blue/[0.08] px-4 py-4">
                  <dt className="text-[15px] font-bold text-dark">
                    {isPaid ? "Total paid" : "Total"}
                  </dt>
                  <dd className="text-xl font-bold text-blue">
                    {formatPrice(order.totalAmount ?? order.total)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ---------------------- next steps ---------------------- */}
            {!isCancelled && (
              <div className="border-b border-gray-3 px-6 py-7 sm:px-10">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-dark">
                  What happens next
                </h2>

                <ol className="mt-5 space-y-5">
                  {NEXT_STEPS.map(({ icon: Icon, title, copy }, i) => (
                    <li key={title} className="flex gap-4">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
                        <Icon className="h-[17px] w-[17px]" />
                        {i < NEXT_STEPS.length - 1 && (
                          <span
                            aria-hidden
                            className="absolute left-1/2 top-full h-5 w-px -translate-x-1/2 bg-gray-3"
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-dark">
                          {title}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-body">
                          {copy}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ---------------------- actions ---------------------- */}
            <div className="flex flex-col gap-3 px-6 py-7 sm:flex-row sm:px-10">
              <Link
                href={isCancelled ? "/cart" : "/"}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
              >
                {isCancelled ? "Back to my cart" : "Continue shopping"}
              </Link>
              <Link
                href="/my-account/orders"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-gray-3 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
              >
                View my orders
              </Link>
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={isPrintPending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-blue/40 px-6 text-[14px] font-semibold text-blue transition-colors hover:bg-blue hover:text-white disabled:cursor-wait disabled:opacity-70"
              >
                {isPrintPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Invoice
              </button>
            </div>
          </div>
        </div>
      </SiteContainer>

      {isPrintPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-3 bg-gray-2 px-8 py-7 text-center shadow-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue" />
            <p className="mt-4 text-[14px] font-semibold text-dark">
              Preparing invoice…
            </p>
            <p className="mt-1 text-[12.5px] text-body">
              The PDF will open or download shortly.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrderConfirmationClient;
