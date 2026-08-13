import React from "react";
import Image from "next/image";
import HeroCarousel from "./HeroCarousel";
import type { Advertisement } from "@/features/advertisements/types/advertisement";

interface HeroProps {
  ads: Advertisement[];
}

const Hero = React.memo(({ ads }: HeroProps) => {
  if (!ads || ads.length === 0) return null;

  return (
    <section className="py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <div className="relative isolate overflow-hidden rounded-3xl border border-gray-3">
          <Image
            src="/images/hero/hero-advertisement.png"
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="-z-20 object-cover"
            priority
          />

          {/* Copy sits on the left, so the scrim is heaviest there. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-1 via-gray-1/85 to-gray-1/45"
          />

          <HeroCarousel ads={ads} />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";
export default Hero;
