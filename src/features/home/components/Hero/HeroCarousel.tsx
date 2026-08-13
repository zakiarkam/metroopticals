"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { Advertisement } from "@/features/advertisements/types/advertisement";
import { getProductImageUrl, normalizeImageArray } from "@/lib/storageUtils";
import { resolveDisplayPrice } from "@/lib/utils/price";

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
};

const createMulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const deterministicShuffle = (items: string[], seed: number) => {
  const array = [...items];
  const random = createMulberry32(seed);
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

interface HeroCarouselProps {
  ads: Advertisement[];
}

type HeroSlide = {
  id: number;
  title: string;
  description: string;
  badge: string;
  price?: number;
  originalPrice?: number;
  primaryImage: string;
  images: string[];
  link: string;
};

const buildHeroSlides = (
  ads: Advertisement[],
  canViewDiscount: boolean
): HeroSlide[] => {
  if (!ads || ads.length === 0) {
    return [];
  }

  return ads.map((ad) => {
    const product = ad.product;
    const productImages = normalizeImageArray(product?.images);
    const adImage = getProductImageUrl(ad.imageUrl);
    const mergedImages = [...productImages];

    if (adImage) {
      mergedImages.unshift(adImage);
    }

    const uniqueImages = Array.from(new Set(mergedImages));
    const fallbackImage = adImage || "/images/hero/hero-01.png";
    const finalImages = uniqueImages.length ? uniqueImages : [fallbackImage];
    const primaryImage = finalImages[0];
    const title = product?.title || ad.title || "Discover our catalog";
    const description =
      product?.description ||
      ad.title ||
      "Explore premium electrical and networking solutions curated for you.";
    const priceData = resolveDisplayPrice(
      product?.price ?? 0,
      product?.discountedPrice ?? null,
      canViewDiscount
    );
    const price = product ? priceData.displayPrice : undefined;
    const originalPrice = priceData.originalPrice;
    const badge =
      priceData.hasDiscount && priceData.discountPercent !== null
        ? `${priceData.discountPercent}% Off`
        : "New Arrival";
    const link = ad.link || (product ? `/shop-details/${product.id}` : "#");

    const extras = finalImages.slice(1);
    const seedValue = `${ad.id}-${title}`;
    const shuffledExtras =
      extras.length > 1
        ? deterministicShuffle(extras, hashString(seedValue))
        : extras;
    const orderedImages = [primaryImage, ...shuffledExtras];

    return {
      id: ad.id,
      title,
      description,
      badge,
      price: price,
      originalPrice,
      primaryImage,
      images: orderedImages,
      link,
    };
  });
};

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Advertisement carousel for the `hero` placement.
 *
 * Slides are a straightforward split: copy on the left, product on a gold-lit
 * plate on the right. The previous version scattered up to three extra product
 * photos around the main one at hard-coded rotations, which collided with the
 * copy at most viewport widths.
 */
const HeroCarousal = React.memo(({ ads }: HeroCarouselProps) => {
  const slides = React.useMemo(() => buildHeroSlides(ads, true), [ads]);

  if (slides.length === 0) return null;

  return (
    <Swiper
      spaceBetween={0}
      centeredSlides
      loop={slides.length > 1}
      autoplay={{ delay: 5000, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      modules={[Autoplay, Pagination]}
      className="hero-carousel"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.id}>
          <div className="grid items-center gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-12 lg:px-14">
            <div>
              <span className="inline-flex w-fit rounded-full border border-blue/40 bg-black/40 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue backdrop-blur">
                {slide.badge}
              </span>

              <h2 className="mt-5 text-[1.7rem] font-bold leading-[1.1] tracking-tight text-white sm:text-[2.3rem]">
                <Link href={slide.link} className="transition-opacity hover:opacity-90">
                  {slide.title}
                </Link>
              </h2>

              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-white/75 line-clamp-3">
                {slide.description}
              </p>

              {slide.price ? (
                <div className="mt-6 flex flex-wrap items-baseline gap-3">
                  <span className="text-[1.7rem] font-bold leading-none text-white">
                    {money(slide.price)}
                  </span>
                  {slide.originalPrice ? (
                    <span className="text-[15px] font-medium text-white/50 line-through">
                      {money(slide.originalPrice)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <Link
                href={slide.link}
                className="group mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-blue px-8 text-[14px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
              >
                Shop now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[380px]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(52% 52% at 50% 50%, rgba(192,156,108,0.30) 0%, transparent 72%)",
                }}
              />
              <Image
                src={slide.primaryImage}
                alt={slide.title}
                fill
                sizes="(max-width: 1024px) 80vw, 380px"
                className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.7)]"
              />
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
});

HeroCarousal.displayName = "HeroCarousal";

export default HeroCarousal;
