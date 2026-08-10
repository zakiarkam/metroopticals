"use client";

import SiteContainer from "@/components/common/SiteContainer";

export default function HomeSectionSkeleton({
  height = "h-64",
}: {
  height?: string;
}) {
  return (
    <section className="w-full py-6">
      <SiteContainer>
        <div
          className={`${height} w-full bg-gray-100 animate-pulse rounded-2xl`}
        />
      </SiteContainer>
    </section>
  );
}
