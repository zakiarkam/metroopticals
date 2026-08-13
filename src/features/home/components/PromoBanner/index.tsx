import React from "react";
import Image from "next/image";
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
      ? `Up to ${priceData.discountPercent}% Off`
      : ad.title || "Promo Deal";
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

const PromoBanner = React.memo(({ ads }: { ads: Advertisement[] }) => {
  if (!ads || ads.length === 0) {
    return null;
  }

  const mainAd = ads[0];
  const secondaryAds = ads.slice(1, 3);
  const mainCard = buildCard(mainAd, true);
  const smallCards = secondaryAds.map((ad) => buildCard(ad, true));

  return (
    <section className="overflow-hidden py-8">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="relative z-1 overflow-hidden rounded-lg bg-gray-1 py-6 lg:py-8 xl:py-10 px-4 sm:px-6 lg:px-8 xl:px-10 mb-4">
          <div className="flex justify-center lg:hidden mb-6">
            <Image
              src={mainCard.image}
              alt={mainCard.title}
              className="w-full max-w-[320px] h-auto object-contain"
              width={320}
              height={320}
            />
          </div>
          <div className="max-w-[550px] w-full">
            <span className="block font-medium text-xl text-dark mb-3 break-words leading-snug">
              {mainCard.title}
            </span>

            <h2 className="font-bold text-xl lg:text-heading-4 xl:text-heading-3 text-dark mb-5 break-words leading-tight">
              {mainCard.label}
            </h2>

            <div className="flex items-center gap-2 mb-4">
              <span className="font-bold text-xl text-blue">
                ${mainCard.price.toFixed(2)}
              </span>
              {mainCard.hasDiscount && mainCard.originalPrice !== undefined && (
                <span className="text-sm text-dark-4 line-through">
                  ${mainCard.originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            <p className="text-sm text-dark-4 mb-6 leading-relaxed break-words">
              {mainCard.description}
            </p>

            <a
              href={mainCard.link}
              className="inline-flex font-medium text-custom-sm text-white bg-blue py-[11px] px-9.5 rounded-md ease-out duration-200 hover:bg-blue-dark mt-7.5"
            >
              Buy Now
            </a>
          </div>

          <Image
            src={mainCard.image}
            alt={mainCard.title}
            className="hidden lg:block absolute bottom-0 right-4 lg:right-26 -z-1"
            width={274}
            height={350}
          />
        </div>

        <div className="grid gap-7.5 grid-cols-1 lg:grid-cols-2">
          {smallCards.map((card) => (
            <div
              key={card.id}
              className="relative z-1 overflow-hidden rounded-lg bg-gray-2 py-10 xl:py-16 px-4 sm:px-7.5 xl:px-10 border border-gray-3"
            >
              <div className="block sm:hidden mb-4">
                <Image
                  src={card.image}
                  alt={card.title}
                  className="w-full h-auto object-cover rounded-md"
                  width={240}
                  height={240}
                />
              </div>
              <Image
                src={card.image}
                alt={card.title}
                className="hidden sm:block absolute top-1/2 -translate-y-1/2 left-3 sm:left-10 -z-1"
                width={240}
                height={240}
              />

              <div className="text-right">
                <span className="block text-lg text-dark mb-1.5 break-words leading-snug">
                  {card.title}
                </span>
                <p className="font-semibold text-custom-1 text-teal mb-2">
                  {card.label}
                </p>
                <div className="flex items-center justify-end gap-2 mb-3">
                  <span className="font-bold text-lg text-teal">
                    ${card.price.toFixed(2)}
                  </span>
                  {card.hasDiscount && card.originalPrice !== undefined && (
                    <span className="text-sm text-dark-4 line-through">
                      ${card.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <a
                  href={card.link}
                  className="inline-flex font-medium text-custom-sm text-white bg-teal py-2.5 px-8.5 rounded-md ease-out duration-200 hover:bg-teal-dark"
                >
                  Grab Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

PromoBanner.displayName = "PromoBanner";

export default PromoBanner;
