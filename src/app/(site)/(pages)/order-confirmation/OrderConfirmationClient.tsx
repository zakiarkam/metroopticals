"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import SiteContainer from "@/components/common/SiteContainer";
import axiosInstance from "@/lib/axiosInstance";
import { downloadOrderReceiptPdf } from "@/lib/utils/orderReceiptPdf";

const OrderConfirmationClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerHeightRef = useRef(0);
  const [isPrintPending, setIsPrintPending] = useState(false);
  const formatAmount = (value?: number) => (value ?? 0).toFixed(2);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateHeaderHeight = () => {
      const headerElement = document.querySelector("header");
      const newHeight = headerElement?.offsetHeight ?? 0;
      if (headerHeightRef.current !== newHeight) {
        headerHeightRef.current = newHeight;
        setHeaderHeight(newHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    window.addEventListener("scroll", updateHeaderHeight);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      window.removeEventListener("scroll", updateHeaderHeight);
    };
  }, []);

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
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, router]);

  const handleDownloadInvoice = async () => {
    if (!order || isPrintPending) {
      return;
    }

    setIsPrintPending(true);
    try {
      await downloadOrderReceiptPdf(order);
    } finally {
      setIsPrintPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-dark mb-4">
            Order not found
          </h2>
          <Link
            href="/"
            className="inline-flex font-medium text-white bg-blue py-3 px-7 rounded-md hover:bg-blue-dark"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <SiteContainer>
        <div className="">
          <div className="bg-gradient-to-br from-gray-2 to-gray-50 shadow-lg border border-gray-200 rounded-2xl p-6 sm:p-8">
            <div className="mb-5">
              <svg
                className="mx-auto h-14 w-14 text-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-dark mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-body mb-1.5">Thank you for your order</p>
            <p className="text-sm text-body mb-6">
              Order Number:{" "}
              <span className="font-semibold text-dark">
                {order.orderNumber}
              </span>
            </p>

            <div className="border-t border-gray-200 pt-5 mb-5">
              <h3 className="text-lg font-semibold text-dark mb-3">
                Order Summary
              </h3>
              <div className="space-y-2.5 text-left bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-body">Subtotal:</span>
                  <span className="font-medium text-dark">
                    Rs {formatAmount(order.subtotal)}
                  </span>
                </div>
                {/* <div className="flex justify-between">
                  <span className="text-body">Shipping:</span>
                  <span className="font-medium text-dark">
                    Rs {formatAmount(order.shippingFee)}
                  </span>
                </div> */}
                <div className="flex justify-between border-t border-gray-200 pt-2.5">
                  <span className="font-bold text-dark">Total:</span>
                  <span className="font-bold text-blue text-lg">
                    Rs {formatAmount(order.totalAmount ?? order.total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={isPrintPending}
                className="block w-full font-semibold text-blue border border-blue py-3 px-6 rounded-lg bg-gray-2 hover:bg-blue-light-5 hover:text-blue transition-all text-center disabled:cursor-wait disabled:opacity-70"
              >
                {isPrintPending ? "Preparing Invoice…" : "Download Invoice"}
              </button>
              <Link
                href="/my-account/orders"
                className="block w-full font-medium text-dark border-2 border-gray-200 py-3 px-6 rounded-lg hover:border-blue hover:bg-blue-light-5 transition-all text-center"
              >
                View Orders
              </Link>
              <Link
                href="/"
                className="block w-full font-bold text-white bg-gradient-to-r from-blue to-blue-dark py-3 px-6 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </SiteContainer>
      {isPrintPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-gray-2 p-6 shadow-xl border border-gray-3">
            <div className="text-center">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent"></div>
              <p className="mt-3 text-sm font-semibold text-dark">
                Preparing invoice...
              </p>
              <p className="mt-1 text-xs text-body">
                The PDF will open or download shortly.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrderConfirmationClient;
