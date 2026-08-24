"use client";

import React from "react";
import AdvertisementsTab from "@/features/advertisements/components/admin/AdvertisementsTab";

const AdvertisementsPage = () => (
  <section className="min-h-screen bg-gray-1 py-6 sm:py-9">
    <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
      <AdvertisementsTab />
    </div>
  </section>
);

export default AdvertisementsPage;
