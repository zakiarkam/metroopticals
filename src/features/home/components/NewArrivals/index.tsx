"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";

import ProductItem from "@/components/common/ProductItem";
import ProductCardSkeleton from "@/components/common/Loaders/ProductCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import { Section, SectionHeading } from "@/components/common/Section";
import { useProducts } from "@/features/products/hooks/use-products";
import type { Product } from "@/features/products/types/product";

/**
 * Latest eight products.
 *
 * The rail is a native scroll-snap container rather than the old
 * measure-and-translate carousel: it keeps touch/trackpad scrolling working for
 * free, needs no resize observers, and cannot desync from the card width.
 */

const ProductRail = React.memo(({ products }: { products: Product[] }) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const frame = useRef<number | null>(null);

  /**
   * Which card the rail is parked on.
   *
   * Measured from the DOM rather than tracked as an index we increment: the
   * rail is also scrollable by touch and trackpad, and a counter desynced from
   * the real scroll position the moment anyone swiped it.
   */
  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);

    let nearest = 0;
    let best = Infinity;
    Array.from(el.children).forEach((child, index) => {
      const distance = Math.abs(
        (child as HTMLElement).offsetLeft - el.scrollLeft,
      );
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  }, []);

  const onScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      sync();
    });
  }, [sync]);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [sync, products.length]);

  const scrollToCard = (index: number) => {
    const el = trackRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  };

  /*
   * One card is shown at full size and the rest step back.
   *
   * It is the second card in view rather than the first: the leading card sits
   * hard against the start of the rail, so emphasising it reads as a card that
   * is half-arrived. The one behind it is clear of the edge and looks chosen.
   * Clamped so the last card takes the emphasis at the end of the rail.
   */
  const focusIndex = Math.min(active + 1, products.length - 1);

  const arrowClass =
    "absolute top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-gray-2 text-dark shadow-3 ring-1 ring-gray-3 transition-colors hover:bg-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-0 lg:inline-flex";

  return (
    <div>
      {/*
       * The arrows live in their own box with the rail so `top-1/2` centres on
       * the cards. When the dots shared this wrapper the arrows were centred on
       * the cards *plus* the dot row, and sat visibly low.
       */}
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollToCard(Math.max(0, active - 1))}
          disabled={atStart}
          aria-label="Previous products"
          className={`${arrowClass} -left-5`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() =>
            scrollToCard(Math.min(products.length - 1, active + 1))
          }
          disabled={atEnd}
          aria-label="More products"
          className={`${arrowClass} -right-5`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={trackRef}
          onScroll={onScroll}
          className="-mx-4 -my-8 flex snap-x snap-mandatory scroll-px-4 items-stretch gap-4 overflow-x-auto scroll-smooth px-4 py-8 [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((item, index) => (
            <div
              key={item.id}
              className={`w-[78%] shrink-0 snap-start transition-transform duration-500 ease-out sm:w-[46%] lg:w-[31.5%] xl:w-[23.6%] ${
                index === focusIndex ? "z-10" : "lg:scale-[0.955]"
              }`}
            >
              <ProductItem
                item={item as never}
                featured={index === focusIndex}
              />
            </div>
          ))}
        </div>
      </div>

      {/* One dot per product. A dot per "page" was accurate but useless: with
          four cards visible out of eight it drew two dots for eight frames. */}
      <div className="mt-8 flex items-center justify-center gap-2">
        {products.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToCard(index)}
            aria-label={`Go to ${item.title}`}
            aria-current={index === active}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === active
                ? "w-7 bg-blue"
                : "w-2.5 bg-gray-4 hover:bg-blue-light"
            }`}
          />
        ))}
      </div>
    </div>
  );
});

ProductRail.displayName = "ProductRail";

const NewArrival = React.memo(() => {
  const { data, loading, error } = useProducts({
    page: 1,
    limit: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <Section tone="raised">
      <SectionHeading
        eyebrow="Just landed"
        title="New arrivals"
        description="The most recent frames to reach the shelf, restocked every week."
        href="/shop-with-sidebar"
      />

      {error && (
        <div className="rounded-2xl border border-red/30 bg-red/10 px-5 py-4 text-[14px] text-red">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && data.products.length > 0 && (
        <ProductRail products={data.products.slice(0, 8)} />
      )}

      {!loading && !error && data.products.length === 0 && (
        <EmptyState
          icon={<PackageSearch className="h-7 w-7" />}
          title="No new arrivals yet"
          description="New frames are added every week  check back soon, or browse the full range."
          action={{ label: "Browse all frames", href: "/shop-with-sidebar" }}
        />
      )}
    </Section>
  );
});

NewArrival.displayName = "NewArrival";

export default NewArrival;
