import type { Metadata } from "next";

// The screen itself is a client component and cannot export metadata, so the
// account area's "My Account" title stood for every tab. Indexing stays off,
// inherited from the account layout and repeated here so a future move of
// this folder cannot quietly lose it.
export const metadata: Metadata = {
  title: "My Orders",
  description: "Track the orders you have placed with Metro Opticals.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
