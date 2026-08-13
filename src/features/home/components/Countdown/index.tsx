"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  <div className="flex flex-col items-center gap-2">
    <span className="grid h-[58px] min-w-[58px] place-items-center rounded-xl border border-blue/25 bg-blue/10 px-3 text-[1.55rem] font-bold tabular-nums text-blue">
      {value < 10 ? `0${value}` : value}
    </span>
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-dark-5">
      {label}
    </span>
  </div>
);

const Separator = () => (
  <span aria-hidden className="mb-6 select-none text-xl font-bold text-gray-4">
    :
  </span>
);

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Time-limited advertisement slot.
 *
 * Deliberately restrained — the ticking clock is the only motion, and the
 * product sits on a plain gold-lit plate rather than the stacked blob shapes
 * the previous version drew (which fought the frame silhouette).
 */
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
    product?.title || advertisement.title || "Limited-time offer";
  const productDescription =
    product?.description ||
    advertisement.title ||
    "A short run at this price — once it is gone, it is gone.";
  const productLink =
    advertisement.link ||
    (product ? `/shop-details/${product.id}` : "/shop-with-sidebar");

  const priceData = resolveDisplayPrice(
    product?.price ?? 0,
    product?.discountedPrice ?? null,
    true
  );

  return (
    <section className="py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <div className="relative grid overflow-hidden rounded-3xl border border-gray-3 bg-gray-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue/30 bg-blue/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue" />
              Limited deal
            </span>

            <h2 className="mt-5 text-[1.6rem] font-bold leading-[1.12] tracking-tight text-dark sm:text-[2.1rem]">
              {productTitle}
            </h2>

            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-body line-clamp-3">
              {productDescription}
            </p>

            {(product?.price ?? 0) > 0 && (
              <div className="mt-6 flex flex-wrap items-baseline gap-3">
                <span className="text-[1.7rem] font-bold leading-none text-dark">
                  {money(priceData.displayPrice)}
                </span>
                {priceData.hasDiscount &&
                  priceData.originalPrice !== undefined && (
                    <>
                      <span className="text-[15px] font-medium text-dark-5 line-through">
                        {money(priceData.originalPrice)}
                      </span>
                      <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-bold text-gray-1">
                        −{priceData.discountPercent}%
                      </span>
                    </>
                  )}
              </div>
            )}

            <div className="mt-7 flex items-center gap-2 sm:gap-3">
              <TimeBox value={timeLeft.days} label="Days" />
              <Separator />
              <TimeBox value={timeLeft.hours} label="Hours" />
              <Separator />
              <TimeBox value={timeLeft.minutes} label="Mins" />
              <Separator />
              <TimeBox value={timeLeft.seconds} label="Secs" />
            </div>

            <Link
              href={productLink}
              className="group mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-blue px-8 text-[14px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
            >
              Shop now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="relative min-h-[260px] overflow-hidden bg-gray-1 lg:min-h-[420px]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(58% 58% at 50% 50%, rgba(192,156,108,0.20) 0%, transparent 72%)",
              }}
            />
            <Image
              src={productImage}
              alt={productTitle}
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-contain p-10 drop-shadow-[0_28px_45px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
});

CounDown.displayName = "CounDown";

export default CounDown;
