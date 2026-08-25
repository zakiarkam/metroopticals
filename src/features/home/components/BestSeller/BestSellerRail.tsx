"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { TopProduct } from "@/features/dashboard/types/dashboard";
import { normalizeImageArray } from "@/lib/storageUtils";
import { formatPrice } from "@/lib/utils/price";

/**
 * Best sellers as an expanding accordion.
 *
 * One panel is open at a time and carries the photograph, the description and
 * the price; the rest collapse to their title. It replaces a three-up grid of
 * ordinary product cards, which said nothing about ranking  every tile looked
 * equally important, which is the opposite of what a "best seller" list is for.
 *
 * The accordion only exists from `lg` up. Below that the panels stack open,
 * because a column of collapsed titles on a phone is just a menu with the
 * pictures hidden.
 */

const FALLBACK = "/images/placeholder-product.svg";
const ROTATE_MS = 5000;

export default function BestSellerRail({ items }: { items: TopProduct[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  // Rotation stops entirely while the pointer or keyboard focus is inside the
  // rail  a panel that reopens itself mid-read is worse than no rotation.
  useEffect(() => {
    stop();
    if (paused || items.length < 2) return;

    timer.current = setInterval(
      () => setActive((current) => (current + 1) % items.length),
      ROTATE_MS,
    );
    return stop;
  }, [items.length, paused, stop]);

  useEffect(() => {
    setActive((current) => (current < items.length ? current : 0));
  }, [items.length]);

  if (!items.length) return null;

  return (
    <div
      className="flex flex-col gap-4 lg:h-[420px] lg:flex-row"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {items.map((item, index) => {
        const open = index === active;
        const image = normalizeImageArray(item.images ?? [])[0] ?? FALLBACK;
        const href = `/shop-details/${item.id}`;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            aria-expanded={open}
            aria-label={item.name}
            className={`group relative flex overflow-hidden rounded-3xl text-left ring-1 ring-gray-3 transition-[flex-grow] duration-700 ease-out ${
              open ? "lg:flex-[2.6]" : "lg:flex-[1]"
            }`}
            style={{
              background:
                "linear-gradient(150deg, #F3E9D6 0%, #FAF5EC 55%, #FFFFFF 100%)",
            }}
          >
            <span className="flex w-full flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-stretch">
              <span className="flex min-w-0 flex-1 flex-col">
                {item.category && (
                  <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.2em] text-blue">
                    {item.category}
                  </span>
                )}

                <span className="block break-words font-display text-[1.3rem] font-bold leading-[1.15] tracking-[-0.03em] text-dark sm:text-[1.5rem]">
                  {item.name}
                </span>

                {/*
                 * The description and price only exist in the open panel. A
                 * collapsed panel is roughly 220px wide, and any body copy in
                 * it wrapped to one word per line.
                 */}
                <span
                  className={`overflow-hidden transition-all duration-500 ${
                    open
                      ? "mt-3 max-h-40 opacity-100"
                      : "mt-0 max-h-0 opacity-0 lg:max-h-0"
                  }`}
                >
                  {item.description && (
                    <span className="line-clamp-3 block text-[13.5px] leading-relaxed text-body">
                      {item.description}
                    </span>
                  )}
                  <span className="mt-3 block font-display text-[1.1rem] font-bold text-dark">
                    {formatPrice(item.discountedPrice || item.price)}
                  </span>
                </span>

                <span className="mt-auto flex items-center gap-3 pt-6">
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex min-h-9 items-center text-[12px] font-bold uppercase tracking-[0.14em] text-dark transition-colors hover:text-blue"
                  >
                    Read more
                  </Link>
                  <span
                    aria-hidden
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                      open
                        ? "bg-blue text-white"
                        : "border border-gray-4 text-dark group-hover:border-blue group-hover:text-blue"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </span>
              </span>

              {/* The photograph belongs to the open panel and is what the
                  expansion is actually revealing. */}
              <span
                className={`relative block shrink-0 overflow-hidden rounded-2xl bg-gray-2 transition-all duration-700 ease-out ${
                  open
                    ? "h-44 w-full opacity-100 lg:h-auto lg:w-[46%]"
                    : "h-0 w-full opacity-0 lg:h-auto lg:w-0"
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 90vw, 320px"
                  className="object-cover"
                />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
