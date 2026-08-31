"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

const FALLBACK = "/images/placeholder-product.svg";

export default function ProductGallery({
  images,
  title,
  badges,
  jumpToIndex = null,
  jumpKey,
}: {
  images: string[];
  title: string;
  /** Discount flag and availability chip, drawn over the main plate. */
  badges?: React.ReactNode;
  /** Land the gallery on this image — set when a colourway with a tagged
      photo is picked. Null asks for no jump; browsing stays free after. */
  jumpToIndex?: number | null;
  /** Changes with each pick (the colour name), so choosing another colour
      re-jumps even between two colours tagged to the same photo. */
  jumpKey?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const hasPhotos = count > 0;
  const isCarousel = count > 1;

  // A product edited in the admin can come back with fewer photos than before.
  useEffect(() => {
    setIndex((current) => (current < count ? current : 0));
  }, [count]);

  // The colour pick lands the gallery on that colour's photo; the arrows and
  // thumbnails stay in charge afterwards.
  useEffect(() => {
    if (jumpToIndex == null || jumpToIndex < 0 || jumpToIndex >= count) return;
    setIndex(jumpToIndex);
  }, [jumpToIndex, jumpKey, count]);

  const step = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    if (!isCarousel) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCarousel, step]);

  const arrowClass =
    "absolute top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-gray-3 bg-gray-2/95 text-dark shadow-2 transition-colors hover:border-blue hover:text-blue";

  return (
    <div>
      <div
        className="group relative aspect-square overflow-hidden rounded-3xl border border-gray-3 bg-gray-2"
        role={isCarousel ? "group" : undefined}
        aria-roledescription={isCarousel ? "carousel" : undefined}
        aria-label={
          isCarousel ? `${title}  image ${index + 1} of ${count}` : undefined
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 55% at 50% 48%, rgba(192,156,108,0.14) 0%, transparent 70%)",
          }}
        />

        <Image
          key={images[index] ?? FALLBACK}
          src={images[index] ?? FALLBACK}
          alt={
            hasPhotos
              ? `${title}${isCarousel ? `  view ${index + 1}` : ""}`
              : `${title}  no photograph available`
          }
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover"
        />

        {badges}

        {isCarousel && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className={`${arrowClass} left-4`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className={`${arrowClass} right-4`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-dark/75 px-3 py-1 text-[11.5px] font-semibold text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {/* Say so rather than passing the placeholder off as the product. */}
      {!hasPhotos && (
        <p className="mt-3 flex items-center justify-center gap-2 text-[12.5px] text-dark-5">
          <ImageOff className="h-4 w-4" aria-hidden />
          Photography for this frame is on its way call us for a closer look.
        </p>
      )}

      {isCarousel && (
        <ul className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-6">
          {images.map((image, thumbIndex) => (
            <li key={`${image}-${thumbIndex}`}>
              <button
                type="button"
                onClick={() => setIndex(thumbIndex)}
                aria-label={`Show image ${thumbIndex + 1}`}
                aria-current={thumbIndex === index}
                className={`relative block aspect-square w-full overflow-hidden rounded-xl border bg-gray-2 transition-colors ${
                  thumbIndex === index
                    ? "border-blue ring-1 ring-blue"
                    : "border-gray-3 hover:border-blue/50"
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="90px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
