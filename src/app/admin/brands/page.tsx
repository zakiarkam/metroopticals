"use client";

import React from "react";
import BrandsTab from "@/features/brands/components/admin/BrandsTab";

const BrandsPage = () => (
  <section className="min-h-screen bg-gray-1 py-6 sm:py-9">
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <BrandsTab />
    </div>
  </section>
);

export default BrandsPage;
