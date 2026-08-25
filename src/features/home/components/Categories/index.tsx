"use client";

import React from "react";

import { useCategories } from "@/features/categories/hooks/use-categories";
import { getCategoryImageUrl } from "@/lib/storageUtils";
import { Section, SectionHeading } from "@/components/common/Section";
import PhotoTile, { type PhotoTileSize } from "@/components/common/PhotoTile";

type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
};

/**
 * The category bento.
 *
 * Was a six-across Swiper of small portrait cards, which gave every category
 * the same weight and hid half of them behind arrows. A bento says something a
 * carousel cannot: the first category gets the room, and nothing is off-screen.
 *
 * The tiles are photographs with the name over them, so the fallback art below
 * is photographic too — the old line-art SVGs were drawn to sit on ivory and
 * disappeared entirely under the scrim.
 */

/**
 * Bundled photography used when a category has no uploaded image.
 *
 * Admin uploads always win; this only decides what a fresh install looks like.
 * Matching on the slug covers the categories an optical shop always carries,
 * and anything unmatched falls back to the shop interior.
 */
const CATEGORY_ART: { match: RegExp; src: string }[] = [
  { match: /sun/, src: "/images/categories/sunglasses.jpg" },
  { match: /contact/, src: "/images/categories/contact-lenses.jpg" },
  { match: /read/, src: "/images/categories/reading-glasses.jpg" },
  { match: /accessor|case|clean|solution|kit/, src: "/images/categories/accessories.jpg" },
  { match: /kid|child|junior/, src: "/images/categories/kids.jpg" },
  { match: /eyeglass|frame|optical|spectacle/, src: "/images/categories/eyeglasses.jpg" },
];

const fallbackArt = (slug: string, name: string) => {
  const haystack = `${slug} ${name}`.toLowerCase();
  return (
    CATEGORY_ART.find((entry) => entry.match.test(haystack))?.src ??
    "/images/categories/shop.jpg"
  );
};

type Placement = { span: string; size: PhotoTileSize };

/**
 * Where each tile sits on the 12-column grid.
 *
 * The four-or-more case is the reference layout: a tall feature on the left,
 * two square tiles stacked to its right, then a wide tile beneath them. The
 * smaller cases are spelled out rather than derived because a shop with two or
 * three categories otherwise inherits the tall feature and leaves half the
 * grid empty beside it.
 *
 * Leftovers past the first four are packed three to a row, and a short final
 * row widens to fill — five categories used to leave two thirds of the last
 * row as blank ivory, which read as a loading failure rather than a layout.
 */
const OPENING: Record<number, Placement[]> = {
  1: [{ span: "lg:col-span-12", size: "lg" }],
  2: [
    { span: "lg:col-span-6", size: "lg" },
    { span: "lg:col-span-6", size: "lg" },
  ],
  3: [
    { span: "lg:col-span-6 lg:row-span-2", size: "lg" },
    { span: "lg:col-span-6", size: "sm" },
    { span: "lg:col-span-6", size: "sm" },
  ],
};

const OPENING_DEFAULT: Placement[] = [
  { span: "lg:col-span-6 lg:row-span-2", size: "lg" },
  { span: "lg:col-span-3", size: "sm" },
  { span: "lg:col-span-3", size: "sm" },
  { span: "lg:col-span-6", size: "md" },
];

const ROW_SPAN: Record<number, string> = {
  1: "lg:col-span-12",
  2: "lg:col-span-6",
  3: "lg:col-span-4",
};

function placementsFor(count: number): Placement[] {
  const opening = OPENING[count] ?? OPENING_DEFAULT;
  const out = [...opening];

  for (let left = count - opening.length; left > 0; ) {
    const inRow = Math.min(3, left);
    for (let i = 0; i < inRow; i++) {
      out.push({ span: ROW_SPAN[inRow], size: "md" });
    }
    left -= inRow;
  }

  return out;
}

const pieces = (count?: number) =>
  count ? `${count} ${count === 1 ? "piece" : "pieces"}` : "Coming soon";

const Categories = React.memo(() => {
  const { categories, loading, error } = useCategories();
  const parentCategories = ((categories || []) as Category[]).filter(
    (category: any) => !category.parentId
  );

  if (loading) {
    return (
      <Section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-12">
          <div className="h-[440px] animate-pulse rounded-2xl bg-gray-8 lg:col-span-6 lg:row-span-2" />
          <div className="h-[240px] animate-pulse rounded-2xl bg-gray-8 lg:col-span-3" />
          <div className="h-[240px] animate-pulse rounded-2xl bg-gray-8 lg:col-span-3" />
          <div className="h-[240px] animate-pulse rounded-2xl bg-gray-8 lg:col-span-6" />
        </div>
      </Section>
    );
  }

  if (error || parentCategories.length === 0) return null;

  const layout = placementsFor(parentCategories.length);

  return (
    <Section>
      <SectionHeading
        eyebrow="Browse the range"
        title="Shop by category"
        titleAccent="Everything we make up."
        description="Prescription frames, sunglasses, contact lenses and everything that keeps them clean."
        href="/shop-with-sidebar"
      />

      {/* `auto-rows-fr` is what makes the tall tile line up with the two
          stacked beside it — without it the row heights follow content and the
          feature tile ends up shorter than the pair it is supposed to span. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-12">
        {parentCategories.map((item, index) => {
          const placement = layout[index];
          // At the two-column breakpoint an odd count strands the last tile in
          // a half-width slot; widening just that one keeps the grid square.
          const widenLast =
            index === parentCategories.length - 1 &&
            parentCategories.length % 2 === 1
              ? "sm:col-span-2"
              : "";

          return (
            <div key={item.id} className={`${widenLast} ${placement.span}`}>
              <PhotoTile
                href={`/shop-with-sidebar?categories=${item.slug}`}
                image={
                  getCategoryImageUrl(item.image) ||
                  fallbackArt(item.slug, item.name)
                }
                imageAlt={item.name}
                title={item.name}
                meta={pieces(item.productCount)}
                size={placement.size}
                priority={index === 0}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
});

Categories.displayName = "Categories";

export default Categories;
