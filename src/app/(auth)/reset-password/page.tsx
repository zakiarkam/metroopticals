import { Suspense } from "react";
import AuthPageSkeleton from "@/features/auth/components/AuthPageSkeleton";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main>
      <Suspense fallback={<AuthPageSkeleton />}>
        <ResetPasswordClient />
      </Suspense>
    </main>
  );
}
