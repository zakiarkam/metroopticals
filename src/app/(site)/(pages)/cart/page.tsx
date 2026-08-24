import React, { Suspense } from "react";
import type { Metadata } from "next";
import Cart from "@/features/cart/components";
import PageLoading from "@/components/common/PageLoading";

export const metadata: Metadata = {
  title: "Cart",
  description:
    "Your shopping cart at Metro Opticals - review your selected items, update quantities, and proceed to secure checkout for a seamless shopping experience.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <Cart />
      </Suspense>
    </>
  );
}
