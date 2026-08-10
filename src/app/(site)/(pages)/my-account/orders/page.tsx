"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AccountSidebar from "@/features/users/components/my-account/AccountSidebar";
import SiteContainer from "@/components/common/SiteContainer";
import InlineSpinner from "@/components/common/InlineSpinner";
import MyOrdersTab from "@/features/users/components/my-account/MyOrders/MyOrdersTab";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

const MyOrdersPage = () => {
  const router = useRouter();
  const { data: session, status } = useCachedSession({ required: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSidebarSelect = useCallback(
    (section: "account" | "orders") => {
      if (section === "account") {
        router.push("/my-account");
      }
    },
    [router]
  );

  const memberSince = useMemo(() => {
    const createdAt = (session?.user as any)?.createdAt;
    const date = createdAt ? new Date(createdAt) : new Date();
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [session?.user]);

  if (!mounted || status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <InlineSpinner size={34} />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className="bg-gray-2 py-6 sm:py-8">
      <SiteContainer>
        <div className="flex flex-col gap-6 xl:flex-row">
          <AccountSidebar
            name={session.user?.name}
            email={session.user?.email}
            role={(session.user as any)?.role}
            memberSince={memberSince}
            activeSection="orders"
            onSectionClick={handleSidebarSelect}
          />

          <div className="flex-1 min-w-0">
            <MyOrdersTab profile={(session.user as any) ?? null} />
          </div>
        </div>
      </SiteContainer>
    </main>
  );
};

export default MyOrdersPage;
