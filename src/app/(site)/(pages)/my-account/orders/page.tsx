"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AccountSidebar from "@/features/users/components/my-account/AccountSidebar";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import PageLoading from "@/components/common/PageLoading";
import MyOrdersTab from "@/features/users/components/my-account/MyOrders/MyOrdersTab";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

const MyOrdersPage = () => {
  const router = useRouter();
  const { data: session, status } = useCachedSession({ required: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // A signed-out visitor used to get a completely blank page here, while
  // /my-account redirected them to the login form. Both redirect now.
  const signedOut = mounted && status !== "loading" && !session?.user;
  useEffect(() => {
    if (signedOut) router.replace("/log-in?callbackUrl=/my-account/orders");
  }, [router, signedOut]);

  const memberSince = useMemo(() => {
    // No join date is better than today's date — the old fallback told a new
    // visitor they had been a member since this morning.
    const createdAt = (session?.user as any)?.createdAt;
    if (!createdAt) return undefined;
    return new Date(createdAt).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }, [session?.user]);

  if (!mounted || status === "loading" || !session?.user) {
    return <PageLoading />;
  }

  return (
    <>
      <PageHero
        eyebrow="Your account"
        title="My orders"
        description="Track what you've bought, download invoices, and check where each order has got to."
        crumbs={[
          { label: "My account", href: "/my-account" },
          { label: "Orders" },
        ]}
      />

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
            <AccountSidebar
              name={session.user?.name}
              email={session.user?.email}
              role={(session.user as any)?.role}
              memberSince={memberSince}
              activeSection="orders"
            />

            <div className="min-w-0 flex-1">
              <MyOrdersTab profile={(session.user as any) ?? null} />
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
};

export default MyOrdersPage;
