import dynamic from "next/dynamic";
import Loading from "./loading";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our range of eyeglasses, sunglasses and contact lenses at Metro Opticals.",
  // other metadata
};

const ShopWithoutSidebar = dynamic(
  () => import("@/features/products/components/ShopWithoutSidebar"),
  { loading: () => <Loading /> }
);

const ShopWithoutSidebarPage = () => {
  return (
    <main>
      <ShopWithoutSidebar />
    </main>
  );
};

export default ShopWithoutSidebarPage;
