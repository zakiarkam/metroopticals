"use client";

import React from "react";
import PosSalesTab from "@/features/pos/components/PosSalesTab";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

const PosSalesPage = () => {
  const { data: session } = useCachedSession();
  const role = (session?.user as any)?.role;

  return (
    <section className="min-h-screen overflow-hidden bg-gray-2 py-4 sm:py-8">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <PosSalesTab canVoid={role === "SUPER_ADMIN"} />
      </div>
    </section>
  );
};

export default PosSalesPage;
