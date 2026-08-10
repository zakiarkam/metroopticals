import { Suspense } from "react";
import type { Metadata } from "next";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "Order confirmation details for your recent purchase.",
  robots: {
    index: false,
    follow: false,
  },
};

const LoadingState = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
  </div>
);

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
