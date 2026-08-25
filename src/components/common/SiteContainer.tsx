import React from "react";

/**
 * The one page gutter.
 *
 * `Section` and `PageHero` both wrap their content in this, so the hero title
 * on an inner page lines up with the cards beneath it. They used to declare
 * their own widths  1560px against SiteContainer's 1600px  which left every
 * inner page misaligned by 36px on a wide display.
 */
export default function SiteContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
