import type { Metadata } from "next";

// As with the orders tab: a client component cannot carry its own metadata.
export const metadata: Metadata = {
  title: "My Prescriptions",
  description: "The prescriptions you have on file at Metro Opticals.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyPrescriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
