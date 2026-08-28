"use client";

import React from "react";
import MessagesTab from "@/features/contact/components/admin/MessagesTab";

const MessagesPage = () => (
  <section className="min-h-screen overflow-hidden bg-gray-2 py-4 sm:py-8">
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <MessagesTab />
    </div>
  </section>
);

export default MessagesPage;
