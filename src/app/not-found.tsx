import type { Metadata } from "next";
import ErrorPage from "@/components/common/error";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/** Any address that does not exist lands on the shop's own 404, not Next's. */
export default function NotFound() {
  return <ErrorPage />;
}
