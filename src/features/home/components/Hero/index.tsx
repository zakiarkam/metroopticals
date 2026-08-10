import React from "react";
import Image from "next/image";
import SiteContainer from "@/components/common/SiteContainer";
import HeroCarousel from "./HeroCarousel";
import type { Advertisement } from "@/features/advertisements/types/advertisement";

interface HeroProps {
  ads: Advertisement[];
}

const Hero = React.memo(({ ads }: HeroProps) => {
  if (!ads || ads.length === 0) return null;

  return (
    <section className="overflow-hidden pt-4">
      <SiteContainer>
        <div className="relative z-1 overflow-hidden rounded-[20px] border border-white/30">
          <div className="relative">
            <div className="absolute inset-0 -z-20">
              <Image
                src="/images/hero/hero-advertisement.png"
                alt="hero advertisement background"
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </div>

            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-transparent to-black/40" />

            <div className="absolute right-0 bottom-0 -z-5">
              <Image
                src="/images/hero/hero-bg.png"
                alt="hero bg shapes"
                width={534}
                height={520}
                className="-mr-10 mb-[-18px]"
              />
            </div>

            <div className="relative z-10">
              <HeroCarousel ads={ads} />
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
});

Hero.displayName = "Hero";
export default Hero;
