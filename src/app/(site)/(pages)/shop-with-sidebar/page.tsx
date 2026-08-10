import dynamic from "next/dynamic";
import Loading from "./loading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our range of eyeglasses, sunglasses and contact lenses at Metro Opticals.",
};

const ShopWithSidebar = dynamic(
  () =>
    import("@/features/products/components/ShopWithSidebar").then(
      (mod) => mod.default
    ),
  {
    loading: () => <Loading />,
  }
);

export default function ShopWithSidebarPage() {
  return (
    <main>
      <ShopWithSidebar />
    </main>
  );
}
