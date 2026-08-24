"use client";

import React from "react";
import ReviewsTab from "@/features/reviews/components/admin/ReviewsTab";

const ReviewsPage = () => (
  <section className="min-h-screen bg-gray-1 py-6 sm:py-9">
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <ReviewsTab />
    </div>
  </section>
);

export default ReviewsPage;
