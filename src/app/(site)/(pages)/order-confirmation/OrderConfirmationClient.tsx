"use client";

import toast from "react-hot-toast";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  PackageCheck,
  Truck,
} from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import EmptyState from "@/components/common/EmptyState";
import axiosInstance from "@/lib/axiosInstance";
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

const OrderConfirmationClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  /** Set only when the request itself failed, as opposed to a real 404. */
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPrintPending, setIsPrintPending] = useState(false);

  useEffect(() => {
    if (!orderId) {
      router.push("/");
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await axiosInstance.get(`/orders/${orderId}`);
        const orderData =
          response.data?.order ?? response.data?.data?.order ?? null;
        setOrder(orderData);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, router]);

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
              <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-green/30 bg-green/10 text-green">
                <CheckCircle2 className="h-8 w-8" />
              </span>

              <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-dark sm:text-[2.1rem]">
                Order placed
              </h1>
              <p className="mt-3 text-[14.5px] leading-relaxed text-body">
                Thanks we have it. Our team will be in touch about your
                prescription within one working day.
              </p>

              <div className="mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-gray-3 bg-gray-1 px-5 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-dark-5">
                  Order
                </span>
                <span className="break-all text-[14px] font-bold text-blue">
                  {order.orderNumber}
                </span>
              </div>
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

                <div className="flex items-baseline justify-between rounded-xl border border-blue/25 bg-blue/[0.08] px-4 py-4">
                  <dt className="text-[15px] font-bold text-dark">
                    Total paid
                  </dt>
                  <dd className="text-xl font-bold text-blue">
                    {formatPrice(order.totalAmount ?? order.total)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ---------------------- next steps ---------------------- */}
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

            {/* ---------------------- actions ---------------------- */}
            <div className="flex flex-col gap-3 px-6 py-7 sm:flex-row sm:px-10">
              <Link
                href="/"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
              >
                Continue shopping
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
