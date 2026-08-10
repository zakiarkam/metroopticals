import React from "react";

export default function SiteContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
