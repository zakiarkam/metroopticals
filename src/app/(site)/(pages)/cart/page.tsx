import React, { Suspense } from "react";
import Cart from "@/features/cart/components";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Cart",
  description:
    "Your shopping cart at Metro Opticals - review your selected items, update quantities, and proceed to secure checkout for a seamless shopping experience.",
  robots: {
    index: false,
    follow: false,
  },
};

function CartContent() {
  return <Cart />;
}

const CartPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
};

export default CartPage;
