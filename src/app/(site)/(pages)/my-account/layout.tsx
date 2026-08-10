import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your account details and order history.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
