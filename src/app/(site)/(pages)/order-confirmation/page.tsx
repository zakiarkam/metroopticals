import { Suspense } from "react";
import type { Metadata } from "next";
import OrderConfirmationClient from "./OrderConfirmationClient";
import PageLoading from "@/components/common/PageLoading";

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "Order confirmation details for your recent purchase.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrderConfirmationPage() {
  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <OrderConfirmationClient />
      </Suspense>
    </>
  );
}
