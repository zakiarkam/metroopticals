"use client";

import React from "react";
import Image from "next/image";
import SiteContainer from "@/components/common/SiteContainer";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const staticSlides = [
  {
    id: "geow-hero-1",
    src: "/images/hero/H-1.png",
    alt: "Structured cables coiled on a steel tray",
  },
  {
    id: "geow-hero-2",
    src: "/images/hero/H-2.png",
    alt: "Technician configuring outdoor network cabinets",
  },
  {
    id: "geow-hero-3",
    src: "/images/hero/H-3.png",
    alt: "Warehouse stacked with telecom components",
  },
];

const heroStats = [
  { id: "frames", value: "500+", label: "Frames In Store" },
  { id: "turnaround", value: "2-3", label: "Days To Collect" },
  { id: "customers", value: "1000+", label: "Happy Customers" },
  { id: "warranty", value: "12", label: "Month Warranty" },
];

const mobileBanners = [
  {
    id: "hero-mobile-1",
    src: "/images/hero/mb-1.png",
    alt: "Hero detail showing structured cabling overview",
  },
  {
    id: "hero-mobile-2",
    src: "/images/hero/mb-2.png",
    alt: "Hero detail showing a technician at work",
  },
  {
    id: "hero-mobile-3",
    src: "/images/hero/mb-3.png",
    alt: "Hero detail showing telecom equipment stack",
  },
];

const HomeUpperHero = React.memo(() => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-1 via-blue-light-5 to-blue-light-3">
      {/* background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[320px] h-[320px] bg-blue-light-3/30 rounded-full blur-3xl -top-32 -left-20 animate-pulse" />
        <div className="absolute w-[320px] h-[320px] bg-blue-light-4/30 rounded-full blur-3xl -bottom-32 -right-16 animate-pulse delay-700" />
      </div>

      {/* grid overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NjNmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-60" />

      <div className="relative z-10">
        <SiteContainer className="">
          <div className="relative home-hero-swiper">
            {/* Desktop */}
            <div className="hidden md:block">
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{ delay: 3200, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                spaceBetween={20}
                slidesPerView={1}
                className="rounded-[28px]"
              >
                {staticSlides.map((slide) => (
                  <SwiperSlide key={slide.id}>
                    <div className="relative w-full overflow-hidden rounded-[28px]">
                      <div className="relative h-[260px] sm:h-[320px] lg:h-[420px]">
                        <Image
                          src={slide.src}
                          alt={slide.alt}
                          fill
                          sizes="(max-width: 1280px) 100vw, 1280px"
                          className="rounded-[28px] object-contain"
                          priority
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{ delay: 2800, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                spaceBetween={15}
                slidesPerView={1}
                className="rounded-[24px]"
              >
                {mobileBanners.map((banner) => (
                  <SwiperSlide key={banner.id}>
                    <div className="relative aspect-square overflow-hidden rounded-[24px]">
                      <Image
                        src={banner.src}
                        alt={banner.alt}
                        fill
                        sizes="100vw"
                        className="object-contain"
                        priority
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>

          {/* Stats (aligned with same container edges) */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {heroStats.map((stat) => (
              <div
                key={stat.id}
                className="flex flex-col items-center gap-1 text-center bg-gradient-to-t from-blue-light-5 to-blue-light-4 border border-blue-light-3 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all"
              >
                <span className="text-xl font-semibold text-blue">
                  {stat.value}
                </span>
                <span className="text-[12px] font-bold uppercase tracking-wide text-dark-4">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </SiteContainer>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-gray-1 to-transparent" />

      {/* keep your pagination styling */}
      <style jsx global>{`
        .home-hero-swiper .swiper-pagination {
          position: absolute;
          bottom: 1rem;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 0.35rem;
          z-index: 10;
        }
        .home-hero-swiper .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </section>
  );
});

HomeUpperHero.displayName = "HomeUpperHero";
export default HomeUpperHero;
