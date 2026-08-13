import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Advertisement } from "@/features/advertisements/types/advertisement";
import { getProductImageUrl } from "@/lib/storageUtils";
import { resolveDisplayPrice } from "@/lib/utils/price";

type PromoCard = {
  id: number;
  title: string;
  description: string;
  label: string;
  image: string;
  link: string;
  price: number;
  originalPrice?: number;
  hasDiscount: boolean;
};

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const buildCard = (ad: Advertisement, canViewDiscount: boolean): PromoCard => {
  const product = ad.product;
  const image =
    getProductImageUrl(product?.images?.[0]) ||
    ad.imageUrl ||
    "/images/promo/promo-01.png";
  const title = product?.title || ad.title || "Featured product";
  const description =
    product?.description ||
    ad.title ||
    "Trusted choice from our curated catalog.";
  const priceData = resolveDisplayPrice(
    product?.price ?? 0,
    product?.discountedPrice ?? null,
    canViewDiscount
  );
  const label =
    priceData.hasDiscount && priceData.discountPercent !== null
      ? `Up to ${priceData.discountPercent}% off`
      : ad.title || "Featured deal";
  const link = ad.link || (product ? `/shop-details/${product.id}` : "#");

  return {
    id: ad.id,
    title,
    description,
    label,
    image,
    link,
    price: priceData.displayPrice,
    originalPrice: priceData.originalPrice,
    hasDiscount: priceData.hasDiscount,
  };
};

/**
 * Advertisement slot rendered between home sections.
 *
 * The first ad becomes a wide feature panel; up to two more render as a pair
 * beneath it. Prices are LKR — the previous version printed `$`.
 */
const PromoBanner = React.memo(({ ads }: { ads: Advertisement[] }) => {
  if (!ads || ads.length === 0) return null;

  const mainCard = buildCard(ads[0], true);
  const smallCards = ads.slice(1, 3).map((ad) => buildCard(ad, true));

  return (
    <section className="py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        {/* ------------------------- feature panel ------------------------- */}
        <div className="relative grid overflow-hidden rounded-3xl border border-gray-3 bg-gray-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <span className="w-fit rounded-full border border-blue/30 bg-blue/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue">
              {mainCard.label}
            </span>

            <h2 className="mt-5 text-[1.6rem] font-bold leading-[1.12] tracking-tight text-dark sm:text-[2.1rem]">
              {mainCard.title}
            </h2>

            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-body line-clamp-3">
              {mainCard.description}
            </p>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-[1.7rem] font-bold leading-none text-dark">
                {money(mainCard.price)}
              </span>
              {mainCard.hasDiscount && mainCard.originalPrice !== undefined && (
                <span className="text-[15px] font-medium text-dark-5 line-through">
                  {money(mainCard.originalPrice)}
                </span>
              )}
            </div>

            <Link
              href={mainCard.link}
              className="group mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-blue px-8 text-[14px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
            >
              Shop this deal
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="relative min-h-[240px] overflow-hidden bg-gray-1 lg:min-h-[380px]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 50%, rgba(192,156,108,0.18) 0%, transparent 72%)",
              }}
            />
            <Image
              src={mainCard.image}
              alt={mainCard.title}
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-contain p-8 drop-shadow-[0_28px_45px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>

        {/* ------------------------- secondary pair ------------------------- */}
        {smallCards.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {smallCards.map((card) => (
              <Link
                key={card.id}
                href={card.link}
                className="group flex items-center gap-5 overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 p-5 transition-colors hover:border-blue/45 sm:gap-7 sm:p-6"
              >
                <div className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-gray-1 sm:h-[130px] sm:w-[130px]">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="130px"
                    className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue">
                    {card.label}
                  </span>
                  <h3 className="mt-2 line-clamp-2 text-[16px] font-semibold capitalize leading-snug text-dark transition-colors group-hover:text-blue">
                    {card.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-[17px] font-bold text-dark">
                      {money(card.price)}
                    </span>
                    {card.hasDiscount && card.originalPrice !== undefined && (
                      <span className="text-[13px] font-medium text-dark-5 line-through">
                        {money(card.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 shrink-0 text-gray-4 transition-all group-hover:translate-x-0.5 group-hover:text-blue" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

PromoBanner.displayName = "PromoBanner";

export default PromoBanner;
