"use client";
import React from "react";
import Image from "next/image";
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

const collageLayouts = [
  { top: -26, left: -20, rotation: -10, width: 154, height: 152 },
  { bottom: -24, right: -18, rotation: 8, width: 184, height: 184 },
  { top: 36, right: -30, rotation: -6, width: 88, height: 70 },
  { bottom: -6, left: -34, rotation: 12, width: 156, height: 86 },
];

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

const HeroCarousal = React.memo(({ ads }: HeroCarouselProps) => {
  const slides = React.useMemo(() => buildHeroSlides(ads, true), [ads]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <Swiper
      spaceBetween={30}
      centeredSlides
      autoplay={{
        delay: 2500,
        disableOnInteraction: false,
      }}
      pagination={{
        clickable: true,
      }}
      modules={[Autoplay, Pagination]}
      className="hero-carousel"
    >
      {slides.map((slide) => {
        const collageExtraImages = slide.images.slice(1, 4);
        return (
          <SwiperSlide key={slide.id}>
            <div className="flex flex-col gap-10 rounded-[20px] px-4 py-10 sm:flex-row sm:items-center sm:gap-10 sm:px-6 lg:px-8">
              <div className="flex-1">
                <div className="flex flex-col gap-6 rounded-[18px] bg-gradient-to-br from-black/70 to-black/30 px-6 py-8 text-white shadow-[0_30px_60px_rgba(0,0,0,0.55)] backdrop-blur-lg">
                  <span className="text-xl font-semibold uppercase tracking-[0.4em] text-white/80">
                    {slide.badge}
                  </span>

                  <div className="space-y-3">
                    <h1 className="text-2xl font-semibold leading-tight text-white sm:text-4xl">
                      <a href={slide.link}>{slide.title}</a>
                    </h1>
                    <p className="text-sm leading-relaxed text-white/80 sm:text-base">
                      {slide.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      {slide.price ? (
                        <span className="text-xl font-semibold text-white sm:text-3xl">
                          Rs {slide.price.toLocaleString()}
                        </span>
                      ) : null}
                      {slide.originalPrice ? (
                        <span className="text-sm text-white/60 line-through">
                          Rs {slide.originalPrice.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <a
                      href={slide.link}
                      className="inline-flex w-fit items-center justify-center rounded-full bg-gray-2/95 px-8 py-3 text-sm font-semibold text-dark transition duration-200 ease-out hover:bg-gray-2 border border-gray-3"
                    >
                      Shop Now
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-[360px]">
                  <div className="relative">
                    <div className="relative overflow-hidden rounded-[20px] border border-white/20">
                      <Image
                        src={slide.primaryImage}
                        alt={slide.title}
                        width={360}
                        height={360}
                        className="h-[320px] w-full object-cover"
                      />
                    </div>

                    {collageExtraImages.length > 0 &&
                      collageExtraImages.map((image, index) => {
                        const layout =
                          collageLayouts[index % collageLayouts.length];
                        const style = {
                          top: layout.top,
                          left: layout.left,
                          bottom: layout.bottom,
                          right: layout.right,
                          width: layout.width,
                          height: layout.height,
                          transform: `rotate(${layout.rotation}deg)`,
                        };
                        return (
                          <div
                            key={`${slide.id}-${image}-${index}`}
                            className="absolute overflow-hidden rounded-[14px] bg-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.45)]"
                            style={style}
                          >
                            <Image
                              src={image}
                              alt={`${slide.title} collage ${index + 1}`}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
});

HeroCarousal.displayName = "HeroCarousal";

export default HeroCarousal;
