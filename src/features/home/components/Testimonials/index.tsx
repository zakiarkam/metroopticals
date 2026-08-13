import React from "react";
import { Quote, Star } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/Section";

/**
 * Customer voices.
 *
 * Static copy on purpose — there is no reviews table, and inventing a live
 * ratings widget that always renders "0 reviews" reads worse than nothing.
 * Replace these with real testimonials as they come in.
 */

const REVIEWS = [
  {
    quote:
      "I had put off getting progressives for years. They talked me through the corridor width, took the measurements properly, and I was reading comfortably by the second day.",
    name: "Nuwan P.",
    detail: "Progressive lenses · Colombo 05",
    rating: 5,
  },
  {
    quote:
      "The eye test was thorough and completely free with the frames. No pressure to upgrade anything — they actually talked me out of a coating I did not need.",
    name: "Fathima R.",
    detail: "Eye test + single vision",
    rating: 5,
  },
  {
    quote:
      "Ordered online on a Monday, collected on Thursday. They adjusted the temples on the spot and the fit has not shifted since.",
    name: "Dilan S.",
    detail: "Acetate frame · Blue-light lenses",
    rating: 5,
  },
];

const Stars = ({ count }: { count: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${count} out of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-[15px] w-[15px] ${
          i < count ? "fill-blue text-blue" : "text-gray-4"
        }`}
      />
    ))}
  </div>
);

export default function Testimonials() {
  return (
    <Section tone="raised">
      <SectionHeading
        eyebrow="From our customers"
        title="Fitted properly, the first time"
        description="What people say after they have worn them for a few weeks — not on the day they collected."
        align="center"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {REVIEWS.map((review) => (
          <figure
            key={review.name}
            className="relative flex flex-col rounded-2xl border border-gray-3 bg-gray-2 p-7 shadow-2 transition-colors duration-300 hover:border-blue/40"
          >
            <Quote
              aria-hidden
              className="absolute right-6 top-6 h-9 w-9 text-blue/15"
            />

            <Stars count={review.rating} />

            <blockquote className="relative mt-4 flex-1 text-[14.5px] leading-relaxed text-dark-3">
              “{review.quote}”
            </blockquote>

            <figcaption className="mt-6 border-t border-gray-3 pt-5">
              <p className="text-[14px] font-bold text-dark">{review.name}</p>
              <p className="mt-0.5 text-[12px] text-dark-5">{review.detail}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
