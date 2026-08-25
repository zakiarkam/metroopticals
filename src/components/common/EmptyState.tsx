import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Shared "nothing here yet" panel. Every list page (cart, wishlist, orders,
 * empty search results) previously drew its own  with different icon sizes,
 * copy weight and button styles.
 *
 * Deliberately not a dashed outline any more: a dashed box is the convention
 * for a drop target or a broken image, so an empty cart read as a page that
 * had failed to load rather than one that was simply waiting for something.
 * It is now a finished-looking panel with the same warm ground as the rest of
 * the storefront.
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
  /** Either a link or a handler  retry-after-error needs the handler form. */
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };
  className?: string;
}) {
  const label = (
    <>
      {action?.label}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-dark text-white transition-transform duration-200 group-hover:rotate-45">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </>
  );

  const actionClasses =
    "group mt-8 inline-flex items-center gap-3 rounded-full bg-blue py-2 pl-7 pr-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-dark";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl px-6 py-16 text-center ring-1 ring-gray-3 sm:py-20 ${className}`}
      style={{
        background:
          "linear-gradient(160deg, #FAF5EC 0%, #FFFFFF 55%, #F4F0E8 100%)",
      }}
    >
      {/* Faint gold wash so the panel has some depth without a border. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, rgba(192,156,108,0.16) 0%, transparent 65%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        {icon && (
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-light-4 text-blue-dark ring-1 ring-blue/20">
            {icon}
          </div>
        )}

        <h3 className="font-display text-[1.3rem] font-bold leading-tight tracking-[-0.025em] text-dark sm:text-[1.55rem]">
          {title}
        </h3>

        {description && (
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-body">
            {description}
          </p>
        )}

        {action &&
          ("href" in action ? (
            <Link href={action.href} className={actionClasses}>
              {label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className={actionClasses}
            >
              {label}
            </button>
          ))}
      </div>
    </div>
  );
}
