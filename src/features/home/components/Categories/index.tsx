"use client";

import React, { useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCategories } from "@/features/categories/hooks/use-categories";
import { getCategoryImageUrl } from "@/lib/storageUtils";
import { Section, SectionHeading } from "@/components/common/Section";

import "swiper/css/navigation";
import "swiper/css";

type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
};

/**
 * Category rail.
 *
 * Tiles are portrait cards rather than the old circular avatars — eyewear is
 * wide, and a circle crops the temples off every frame photo.
 */
/**
 * Bundled artwork used when a category has no uploaded image.
 *
 * A single grey initial was the old fallback, which turned the rail into a row
 * of letters on a fresh install. Matching on the slug covers the categories an
 * optical shop always has; anything unmatched falls back to the generic plate.
 */
const CATEGORY_ART: { match: RegExp; src: string }[] = [
  { match: /sun/, src: "/images/dummy/categories/sunglasses.svg" },
  { match: /contact|lens/, src: "/images/dummy/categories/premium.svg" },
  { match: /accessor|case|clean|solution/, src: "/images/dummy/categories/computer.svg" },
  { match: /read/, src: "/images/dummy/categories/reading.svg" },
  { match: /kid|child|junior/, src: "/images/dummy/categories/kids.svg" },
  { match: /wom|ladies/, src: "/images/dummy/categories/women.svg" },
  { match: /men/, src: "/images/dummy/categories/men.svg" },
  { match: /computer|blue|screen/, src: "/images/dummy/categories/computer.svg" },
  { match: /premium|designer|luxury/, src: "/images/dummy/categories/premium.svg" },
];

const fallbackArt = (slug: string, name: string) => {
  const haystack = `${slug} ${name}`.toLowerCase();
  return (
    CATEGORY_ART.find((entry) => entry.match.test(haystack))?.src ??
    "/images/dummy/categories/eyeglasses.svg"
  );
};

const CategoryTile = React.memo(({ item }: { item: Category }) => {
  const imageUrl =
    getCategoryImageUrl(item.image) || fallbackArt(item.slug, item.name);

  return (
    <Link
      href={`/shop-with-sidebar?category=${item.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 transition-all duration-300 hover:-translate-y-1 hover:border-blue/45 hover:shadow-gold"
    >
      <div className="relative flex aspect-[5/4] items-center justify-center overflow-hidden bg-gray-1 p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(65% 65% at 50% 55%, rgba(192,156,108,0.22) 0%, transparent 72%)",
          }}
        />

        <Image
          src={imageUrl}
          alt=""
          width={280}
          height={224}
          sizes="(max-width: 768px) 60vw, 220px"
          unoptimized={imageUrl.endsWith(".svg")}
          className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-1 border-t border-gray-3 px-3 py-4 text-center">
        <p className="line-clamp-1 text-[13.5px] font-semibold capitalize text-dark transition-colors group-hover:text-blue">
          {item.name}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-dark-5">
          {item.productCount ? `${item.productCount} items` : "Coming soon"}
        </p>
      </div>
    </Link>
  );
});

CategoryTile.displayName = "CategoryTile";

const NavButton = ({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={direction === "prev" ? "Previous categories" : "Next categories"}
    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 bg-gray-2 text-dark transition-colors hover:border-blue hover:text-blue"
  >
    {direction === "prev" ? (
      <ChevronLeft className="h-[18px] w-[18px]" />
    ) : (
      <ChevronRight className="h-[18px] w-[18px]" />
    )}
  </button>
);

const Categories = React.memo(() => {
  const sliderRef = useRef<any>(null);
  const { categories, loading, error } = useCategories();
  const parentCategories = (categories || []).filter(
    (category: any) => !category.parentId
  );

  const handlePrev = useCallback(() => sliderRef.current?.swiper?.slidePrev(), []);
  const handleNext = useCallback(() => sliderRef.current?.swiper?.slideNext(), []);

  if (loading) {
    return (
      <Section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[220px] animate-pulse rounded-2xl border border-gray-3 bg-gray-8"
            />
          ))}
        </div>
      </Section>
    );
  }

  if (error || parentCategories.length === 0) return null;

  return (
    <Section>
      <SectionHeading
        eyebrow="Browse the range"
        title="Shop by category"
        description="Prescription frames, sunglasses, contact lenses and everything that keeps them clean."
        href="/shop-with-sidebar"
      />

      <div className="relative">
        <Swiper
          ref={sliderRef}
          slidesPerView={6}
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 1.5, spaceBetween: 12 },
            480: { slidesPerView: 2.2, spaceBetween: 12 },
            640: { slidesPerView: 3, spaceBetween: 16 },
            1000: { slidesPerView: 4, spaceBetween: 16 },
            1200: { slidesPerView: 6, spaceBetween: 16 },
          }}
          className="!pb-1"
        >
          {parentCategories.map((item: Category) => (
            <SwiperSlide key={item.id} className="!h-auto">
              <CategoryTile item={item} />
            </SwiperSlide>
          ))}
        </Swiper>

        {parentCategories.length > 2 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <NavButton direction="prev" onClick={handlePrev} />
            <NavButton direction="next" onClick={handleNext} />
          </div>
        )}
      </div>
    </Section>
  );
});

Categories.displayName = "Categories";

export default Categories;
