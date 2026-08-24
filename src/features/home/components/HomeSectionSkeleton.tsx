"use client";

/** Placeholder shown while a code-split home section streams in. */
export default function HomeSectionSkeleton({
  height = "h-64",
}: {
  height?: string;
}) {
  return (
    <section className="w-full py-14 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <div
          className={`${height} w-full animate-pulse rounded-2xl border border-gray-3 bg-gray-8`}
        />
      </div>
    </section>
  );
}
