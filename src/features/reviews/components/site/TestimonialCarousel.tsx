"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";

/**
 * Home page social proof as a horizontal slider.
 *
 * Heading, controls and a progress bar sit in a left column; review cards
 * scroll horizontally with CSS scroll-snap so touch users swipe natively and
 * the arrows simply nudge the same scroll container. Cards are speech bubbles
 * with the reviewer's initial in a gold disc  the shop never collects photos,
 * so a letter is the honest avatar.
 */

export type TestimonialReview = {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  createdAt?: string;
  user?: { name: string | null } | null;
  product?: { id: number; title: string } | null;
};

const relativeTime = (iso?: string) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (diff < day) return "Today";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const initialOf = (name?: string | null) =>
  (name?.trim().match(/[A-Za-z0-9]/)?.[0] ?? "M").toUpperCase();

// A few gold-family tints so a row of avatars doesn't read as identical discs.
const AVATAR_TINTS = [
  "bg-blue text-white",
  "bg-blue-dark text-white",
  "bg-blue-light-4 text-blue-dark",
  "bg-dark text-white",
];

export default function TestimonialCarousel({
  reviews,
}: {
  reviews: TestimonialReview[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 1);
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const nudge = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
      {/* ----------------------------------------------------- left column */}
      <div className="flex flex-col justify-between">
        <div>
          <span
            aria-hidden="true"
            className="block font-serif text-[64px] leading-[0.7] text-blue-light-3 sm:text-[88px]"
          >
            &ldquo;
          </span>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
            Verified buyers
          </p>
          <h2 className="mt-2 text-[26px] font-semibold leading-[1.15] text-dark sm:text-[34px]">
            What our customers are saying
          </h2>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Previous reviews"
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-default disabled:opacity-30 disabled:hover:border-gray-3 disabled:hover:text-dark"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-gray-3">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-dark transition-[width] duration-300"
              style={{ width: `${Math.max(12, progress * 100)}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Next reviews"
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-default disabled:opacity-30 disabled:hover:border-gray-3 disabled:hover:text-dark"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------- track */}
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {reviews.map((review, index) => {
          const name = review.user?.name?.trim() || "Verified customer";
          const tint = AVATAR_TINTS[index % AVATAR_TINTS.length];

          return (
            <figure
              key={review.id}
              data-card
              className="w-[82vw] min-w-0 max-w-[360px] shrink-0 snap-start sm:w-[340px]"
            >
              {/* Speech bubble: card plus a small tail drawn with a rotated
                  square so it inherits the card's border and shadow. */}
              <div className="relative rounded-2xl border border-gray-3 bg-white p-5 shadow-1 sm:p-6">
                {review.title && (
                  <h3 className="mb-2 text-[15px] font-semibold text-dark">
                    {review.title}
                  </h3>
                )}
                <blockquote className="line-clamp-6 text-[14.5px] leading-[1.7] text-body">
                  {review.body}
                </blockquote>

                <span
                  className="mt-5 inline-flex items-center gap-0.5"
                  role="img"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(review.rating)
                          ? "fill-blue text-blue"
                          : "fill-gray-3 text-gray-3"
                      }`}
                    />
                  ))}
                </span>

                <span
                  aria-hidden="true"
                  className="absolute -bottom-[9px] left-8 h-4 w-4 rotate-45 border-b border-r border-gray-3 bg-white"
                />
              </div>

              <figcaption className="mt-5 flex items-center gap-3 pl-1">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[17px] font-bold ${tint}`}
                >
                  {initialOf(name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-dark">
                    {name}
                  </span>
                  <span className="block truncate text-[12px] text-dark-5">
                    {relativeTime(review.createdAt)}
                    {review.product && (
                      <>
                        {review.createdAt ? " · " : ""}
                        <Link
                          href={`/shop-details/${review.product.id}`}
                          className="transition-colors hover:text-blue"
                        >
                          {review.product.title}
                        </Link>
                      </>
                    )}
                  </span>
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
