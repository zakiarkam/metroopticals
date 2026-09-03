"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AccountSidebar from "@/features/users/components/my-account/AccountSidebar";
import MyPrescriptionsTab from "@/features/prescriptions/components/MyPrescriptionsTab";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import PageLoading from "@/components/common/PageLoading";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

const MyPrescriptionsPage = () => {
  const router = useRouter();
  const { data: session, status } = useCachedSession({ required: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const signedOut = mounted && status !== "loading" && !session?.user;
  useEffect(() => {
    if (signedOut) {
      router.replace("/log-in?redirect=/my-account/prescriptions");
    }
  }, [router, signedOut]);

  const memberSince = useMemo(() => {
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
        title="My prescriptions"
        description="The powers we have on file for you. Pick one at checkout instead of typing it again — and when your eyes change, we keep the old one alongside the new."
        crumbs={[
          { label: "My account", href: "/my-account" },
          { label: "Prescriptions" },
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
              activeSection="prescriptions"
            />

            <div className="min-w-0 flex-1">
              <MyPrescriptionsTab />
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
};

export default MyPrescriptionsPage;
