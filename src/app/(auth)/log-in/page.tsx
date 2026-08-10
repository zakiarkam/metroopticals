import { Suspense } from "react";
import AuthPageSkeleton from "@/features/auth/components/AuthPageSkeleton";
import AuthClient from "./AuthClient";

export const metadata = {
  title: "Login",
  description: "Authentication page",
  robots: {
    index: false,
    follow: false,
  },
};

const AdminLoginPage = () => {
  return (
    <main>
      <Suspense fallback={<AuthPageSkeleton />}>
        <AuthClient />
      </Suspense>
    </main>
  );
};

export default AdminLoginPage;
