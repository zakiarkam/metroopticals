import { Suspense } from "react";
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
      (mod) => mod.default,
    ),
  {
    loading: () => <Loading />,
  },
);

export default function ShopWithSidebarPage() {
  return (
    <>
      {/* The shop seeds its filters from the URL, which opts the route out of
          static prerendering  Suspense gives Next a shell to emit instead. */}
      <Suspense fallback={<Loading />}>
        <ShopWithSidebar />
      </Suspense>
    </>
  );
}
