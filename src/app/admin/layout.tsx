import AdminLayoutClient from "./AdminLayoutClient";

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard for managing store operations",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
