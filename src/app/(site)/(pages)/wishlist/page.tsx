import React from "react";
import { Wishlist } from "@/features/wishlist/components";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "Manage your favorite products at Metro Opticals - view and edit your wishlist anytime.",
  robots: {
    index: false,
    follow: false,
  },
};

const WishlistPage = () => {
  return (
    <main>
      <Wishlist />
    </main>
  );
};

export default WishlistPage;
