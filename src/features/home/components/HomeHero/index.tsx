import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import { siteConfig } from "@/config/site";
import { getAdvertisementImageUrl } from "@/lib/storageUtils";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * The home page hero.
 *
 * One editorial photograph on the storefront's cream stage. The image sits on
 * the right and dissolves into the cream panel on the left, where the headline
 * and the single primary action live, so the section reads as one continuous
 * surface rather than a text column beside a picture.
 *
 * The photograph is admin-editable (`home.hero.image`); the shipped default
 * is our own still of a frame in a Metro Opticals presentation case.
 */

const FALLBACK_IMAGE = "/images/hero/hero-metro-case.jpg";
// Matches `gray-1` so the photograph's own background and the fade are one.
const STAGE = "#FAF8F4";

export default function HomeHero({ data }: { data: BlockData }) {
  const image = getAdvertisementImageUrl(data?.image) || FALLBACK_IMAGE;

  return (
    <section
      className="relative isolate overflow-hidden text-dark"
      style={{ backgroundColor: STAGE }}
    >
      {/* ------------------------------------------------------ photograph */}
      <div className="absolute inset-0 lg:left-[30%]">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center] lg:object-center"
        />
        {/* Dissolve into the stage: strong from the left so copy stays
            legible, soft from the bottom so the section meets the page. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${STAGE} 0%, rgba(250,248,244,0.94) 20%, rgba(250,248,244,0.6) 46%, rgba(250,248,244,0.05) 76%, rgba(250,248,244,0) 100%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,248,244,0.9) 0%, rgba(250,248,244,0.45) 45%, rgba(250,248,244,0.92) 100%)",
          }}
        />
      </div>

      {/* Gold bloom where the light would fall. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 72% 35%, rgba(192,156,108,0.16) 0%, transparent 70%)",
        }}
      />

      {/* ------------------------------------------------------------ copy */}
      <SiteContainer className="relative">
        <div className="flex min-h-[540px] items-center py-14 sm:min-h-[580px] lg:min-h-[620px] lg:py-24">
          <div className="max-w-3xl">
            {data?.eyebrow && (
              <span className="inline-flex pl-2 items-center gap-2  text-[14.5px] font-bold uppercase tracking-[0.16em] text-blue-dark backdrop-blur-sm">
                {data.eyebrow}
              </span>
            )}

            <h1 className="mt-6 font-display text-[2.5rem] font-bold uppercase leading-[0.98] tracking-[-0.02em] text-dark sm:text-[3.5rem] lg:text-[4.3rem]">
              {data?.headline || "Focus,"}
              {data?.headlineSecondLine && (
                <span className="block text-blue">
                  {data.headlineSecondLine}
                </span>
              )}
            </h1>

            {data?.body && (
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-body sm:text-[15.5px]">
                {data.body}
              </p>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {data?.ctaLabel && (
                <Link
                  href={data.ctaHref || "/shop-with-sidebar"}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue px-7 text-[14.5px] font-bold text-white transition-colors hover:bg-blue-dark sm:w-auto"
                >
                  {data.ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}

              {data?.secondaryLabel && (
                <Link
                  href={data.secondaryHref || "/contact"}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-4 bg-white/60 px-7 text-[14.5px] font-bold text-dark backdrop-blur-sm transition-colors hover:border-blue hover:text-blue sm:w-auto"
                >
                  {data.secondaryLabel}
                </Link>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-dark-4">
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
        </div>
      </SiteContainer>

      {/* Thin gold rule where the hero meets the brand rail. */}
      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-transparent via-blue-light/60 to-transparent"
      />
    </section>
  );
}
