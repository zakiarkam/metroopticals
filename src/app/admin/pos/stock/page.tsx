"use client";

import React from "react";
import PosStockTab from "@/features/pos/components/PosStockTab";

const PosStockPage = () => (
  <section className="min-h-screen overflow-hidden bg-gray-2 py-4 sm:py-8">
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <PosStockTab />
    </div>
  </section>
);

export default PosStockPage;
