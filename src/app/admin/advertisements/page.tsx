"use client";
import React, { useState } from "react";
import AdvertisementsTab from "@/features/advertisements/components/admin/AdvertisementsTab";

const AdvertisementsPage = () => {
  const [dateRange, setDateRange] = useState<string>("30");

  return (
    <section className="overflow-hidden py-4 sm:py-8 bg-gray-2 min-h-screen">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7.5">
          <div className="space-y-7.5">
            <AdvertisementsTab dateRange={dateRange} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdvertisementsPage;
