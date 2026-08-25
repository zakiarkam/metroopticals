"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import { siteConfig } from "@/config/site";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * The home page hero.
 *
 * One statement, one primary action, one image. The previous hero stacked a
 * rotated wordmark, a frame carousel, an eye-test promo panel, a contour
 * overlay and a doodle layer into the same viewport, so nothing read as the
 * primary action and the first price on the page was below the fold.
 *
 * The frame images cross-fade on a timer and can be stepped through by hand;
 * that is the only motion left.
 */

const FRAMES = [
  { src: "/images/hero/frames/wayfarer-optical.png", label: "Wayfarer optical" },
  { src: "/images/hero/frames/round-gold.png", label: "Round gold" },
  { src: "/images/hero/frames/round-tortoise.png", label: "Round tortoise" },
  { src: "/images/hero/frames/wayfarer-black.png", label: "Wayfarer black" },
];

const ROTATE_MS = 5000;

export default function HomeHero({ data }: { data: BlockData }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % FRAMES.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section
      className="relative overflow-hidden bg-gray-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* One soft gold bloom behind the frame, nothing else. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 70% at 78% 42%, rgba(192,156,108,0.20) 0%, transparent 68%)",
        }}
      />

      <SiteContainer className="relative">
        <div className="grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
          {/* ------------------------------------------------ copy */}
          <div className="max-w-xl">
            {data?.eyebrow && (
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-light-3 bg-blue-light-5 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-blue-dark">
                {data.eyebrow}
              </span>
            )}

            <h1 className="mt-5 font-display text-[2.15rem] font-bold leading-[1.06] tracking-[-0.035em] text-dark sm:text-[2.9rem] lg:text-[3.4rem]">
              {data?.headline || "Glasses that fit"}
              {data?.headlineSecondLine && (
                <span className="block text-blue">
                  {data.headlineSecondLine}
                </span>
              )}
            </h1>

            {data?.body && (
              <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-body">
                {data.body}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {data?.ctaLabel && (
                <Link
                  href={data.ctaHref || "/shop-with-sidebar"}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue px-7 sm:w-auto text-[14.5px] font-bold text-white transition-colors hover:bg-blue-dark"
                >
                  {data.ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}

              {data?.secondaryLabel && (
                <Link
                  href={data.secondaryHref || "/contact"}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-4 px-7 sm:w-auto text-[14.5px] font-bold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  {data.secondaryLabel}
                </Link>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-dark-4">
              {data?.hoursNote && <span>{data.hoursNote}</span>}
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex items-center gap-1.5 font-semibold text-dark transition-colors hover:text-blue"
              >
                <Phone className="h-3.5 w-3.5" />
                {siteConfig.contact.phone}
              </a>
            </div>
          </div>

          {/* ----------------------------------------------- image */}
          <div className="relative">
            <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
              {FRAMES.map((frame, index) => (
                <Image
                  key={frame.src}
                  src={frame.src}
                  alt={index === active ? frame.label : ""}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1024px) 90vw, 560px"
                  className={`object-contain transition-opacity duration-700 ${
                    index === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              {FRAMES.map((frame, index) => (
                <button
                  key={frame.src}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show ${frame.label}`}
                  aria-current={index === active}
                  className={`h-2 rounded-full transition-all ${
                    index === active
                      ? "w-7 bg-blue"
                      : "w-2 bg-gray-4 hover:bg-blue-light"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
