import React from "react";
import Link from "next/link";

/**
 * Shared "nothing here yet" panel. Every list page (cart, wishlist, orders,
 * empty search results) previously drew its own — with different icon sizes,
 * copy weight and button styles.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-3 bg-gray-2/60 px-6 py-16 text-center ${className}`}
    >
      {icon && (
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-3 bg-gray-1 text-blue">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-dark">{title}</h3>

      {description && (
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-body">
          {description}
        </p>
      )}

      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue px-7 text-[13px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
