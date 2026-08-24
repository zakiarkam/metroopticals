"use client";

import React from "react";
import StorefrontEditor from "@/features/site-content/components/admin/StorefrontEditor";

const StorefrontPage = () => (
  <section className="min-h-screen bg-gray-1 py-6 sm:py-9">
    <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
      <StorefrontEditor />
    </div>
  </section>
);

export default StorefrontPage;
