"use client";

import AdminHeader from "@/app/admin/_components/AdminHeader";
import AdminSidebar from "@/app/admin/_components/AdminSidebar";
import PreLoader from "@/components/common/PreLoader";
import { ReduxProvider } from "@/store/provider";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const { data: session, status } = useCachedSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      const currentPath = window.location.pathname;
      router.push(`/log-in?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (status === "authenticated") {
      setLoading(false);
    }
  }, [status, router]);

  if (loading || status === "loading") {
    return <PreLoader />;
  }

  if (!session) {
    return <PreLoader />;
  }

  return (
    <ReduxProvider>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <AdminHeader
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </ReduxProvider>
  );
}

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-2 antialiased min-h-screen">
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </div>
  );
}
