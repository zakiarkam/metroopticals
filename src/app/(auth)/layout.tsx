import AuthLayoutClient from "./AuthLayoutClient";

export const metadata = {
  title: "Sign In",
  description: "Log in or create an admin account",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
