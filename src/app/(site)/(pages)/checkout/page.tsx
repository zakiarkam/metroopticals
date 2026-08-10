import React from "react";
import Checkout from "@/features/checkout/components";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Secure checkout process at Metro Opticals - review your order details, enter shipping information, and complete your purchase with confidence.",
  robots: {
    index: false,
    follow: false,
  },
};

const CheckoutPage = () => {
  return (
    <main>
      <Checkout />
    </main>
  );
};

export default CheckoutPage;
