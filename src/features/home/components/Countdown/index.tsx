"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Advertisement } from "@/features/advertisements/types/advertisement";
import { getProductImageUrl } from "@/lib/storageUtils";
import { resolveDisplayPrice } from "@/lib/utils/price";

interface CountdownProps {
  advertisement: Advertisement | null;
}

const fallbackCountdownDate = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const calculateTimeLeft = (endDate: Date) => {
  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

const TimeBox = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="min-w-[60px] h-14 font-bold text-2xl lg:text-3xl text-white bg-blue rounded-lg flex items-center justify-center shadow-md px-3 mb-1.5">
      {value < 10 ? `0${value}` : value}
    </span>
    <span className="text-xs font-medium text-blue-light-3 uppercase tracking-wider">
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span className="text-blue-light-2 font-bold text-2xl mb-5 select-none">:</span>
);

const CounDown = React.memo(({ advertisement }: CountdownProps) => {
  const targetDate = useMemo(() => {
    if (advertisement?.endDate) return new Date(advertisement.endDate);
    return fallbackCountdownDate();
  }, [advertisement?.endDate]);

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDate));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!advertisement) return null;

  const product = advertisement.product;
  const productImage =
    getProductImageUrl(product?.images?.[0]) ||
    "/images/countdown/countdown-01.png";
  const productTitle =
    product?.title || advertisement.title || "Upgrade Your Structured Cabling";
  const productDescription =
    product?.description ||
    advertisement.title ||
    "Stock up on quality cabling supplies for flawless installations.";
  const productLink =
    advertisement.link ||
    (product ? `/shop-details/${product.id}` : "/shop-with-sidebar");

  const priceData = resolveDisplayPrice(
    product?.price ?? 0,
    product?.discountedPrice ?? null,
    true
  );

  return (
    <section className="overflow-hidden py-8">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-2xl bg-dark px-6 py-10 sm:px-10 lg:px-14 lg:py-12">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-blue opacity-10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-teal opacity-10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10">
            {/* Left: content */}
            <div className="flex-1 max-w-[480px] w-full">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 bg-blue text-white text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Limited Deal
              </span>

              <h2 className="font-bold text-white text-xl lg:text-heading-4 xl:text-heading-3 mb-3 leading-tight">
                {productTitle}
              </h2>

              <p className="text-blue-light-3 text-sm leading-relaxed mb-5">
                {productDescription}
              </p>

              {/* Price */}
              {(product?.price ?? 0) > 0 && (
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-2xl font-extrabold text-teal">
                    ${priceData.displayPrice.toFixed(2)}
                  </span>
                  {priceData.hasDiscount && priceData.originalPrice !== undefined && (
                    <>
                      <span className="text-base text-dark-4 line-through">
                        ${priceData.originalPrice.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold bg-teal/20 text-teal px-2 py-0.5 rounded-full">
                        -{priceData.discountPercent}% OFF
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Countdown timer */}
              <div className="flex items-center gap-2 sm:gap-3 mb-8">
                <TimeBox value={timeLeft.days} label="Days" />
                <Separator />
                <TimeBox value={timeLeft.hours} label="Hours" />
                <Separator />
                <TimeBox value={timeLeft.minutes} label="Mins" />
                <Separator />
                <TimeBox value={timeLeft.seconds} label="Secs" />
              </div>

              <a
                href={productLink}
                className="inline-flex items-center gap-2 font-semibold text-sm text-white bg-teal py-3 px-8 rounded-lg ease-out duration-200 hover:bg-teal-dark shadow-md"
              >
                Shop Now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* Right: product image with cloud blob design */}
            <div className="flex flex-1 justify-center lg:justify-end items-center mt-6 lg:mt-0">
              <div
                className="relative flex items-center justify-center"
                style={{ width: "min(360px, 88vw)", height: "min(320px, 78vw)" }}
              >
                {/* Teal glow — furthest back */}
                <div
                  className="absolute"
                  style={{
                    inset: 0,
                    background: "rgba(2,170,164,0.30)",
                    borderRadius: "65% 35% 50% 50% / 40% 60% 40% 60%",
                    transform: "translate(18px, 20px) scale(1.12)",
                    filter: "blur(10px)",
                  }}
                />
                {/* Blue glow */}
                <div
                  className="absolute"
                  style={{
                    inset: 0,
                    background: "rgba(60,80,224,0.30)",
                    borderRadius: "50% 50% 38% 62% / 54% 46% 54% 46%",
                    transform: "translate(-14px, -12px) scale(1.06)",
                    filter: "blur(6px)",
                  }}
                />
                {/* Front cloud — clips image + dots inside */}
                <div
                  className="absolute inset-0 overflow-hidden flex items-center justify-center"
                  style={{
                    background: "#E1E8FF",
                    borderRadius: "58% 42% 52% 48% / 48% 54% 46% 52%",
                  }}
                >
                  {/* Dot grid — top right */}
                  <div
                    className="absolute"
                    style={{
                      top: "8%",
                      right: "5%",
                      width: 60,
                      height: 60,
                      backgroundImage:
                        "radial-gradient(circle, #3C50E0 1.3px, transparent 1.3px)",
                      backgroundSize: "10px 10px",
                      opacity: 0.3,
                    }}
                  />
                  {/* Dot grid — bottom left */}
                  <div
                    className="absolute"
                    style={{
                      bottom: "8%",
                      left: "5%",
                      width: 44,
                      height: 44,
                      backgroundImage:
                        "radial-gradient(circle, #02AAA4 1.3px, transparent 1.3px)",
                      backgroundSize: "10px 10px",
                      opacity: 0.28,
                    }}
                  />
                  {/* Product image — multiply blends white away on light bg */}
                  <Image
                    src={productImage}
                    alt={productTitle}
                    width={280}
                    height={240}
                    className="object-contain w-[78%] h-[78%] drop-shadow-lg"
                    style={{ mixBlendMode: "multiply" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

CounDown.displayName = "CounDown";

export default CounDown;
