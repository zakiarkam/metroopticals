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
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges, products.length]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    // One "page" is the visible width minus a card peek, so context is kept.
    el.scrollBy({ left: direction * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={syncEdges}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-5"
      >
        {products.map((item) => (
          <div
            key={item.id}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%] xl:w-[23.6%]"
          >
            <ProductItem item={item as never} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          disabled={atStart}
          aria-label="Previous products"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 bg-gray-2 text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-3 disabled:hover:text-dark"
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          disabled={atEnd}
          aria-label="More products"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 bg-gray-2 text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-3 disabled:hover:text-dark"
        >
          <ChevronRight className="h-[18px] w-[18px]" />
        </button>
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
          description="New frames are added every week — check back soon, or browse the full range."
          action={{ label: "Browse all frames", href: "/shop-with-sidebar" }}
        />
      )}
    </Section>
  );
});

NewArrival.displayName = "NewArrival";

export default NewArrival;
