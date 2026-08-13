"use client";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import ProductItem from "@/components/common/ProductItem";
import { useProducts } from "@/features/products/hooks/use-products";
import type { Product } from "@/features/products/types/product";

const NewArrival = React.memo(() => {
  const { data, loading, error } = useProducts({
    page: 1,
    limit: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <section className="overflow-hidden pt-8">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="flex items-center gap-2.5 font-medium text-dark mb-1.5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.11826 15.4622C4.11794 16.6668 5.97853 16.6668 9.69971 16.6668H10.3007C14.0219 16.6668 15.8825 16.6668 16.8821 15.4622M3.11826 15.4622C2.11857 14.2577 2.46146 12.429 3.14723 8.77153C3.63491 6.17055 3.87875 4.87006 4.8045 4.10175M3.11826 15.4622C3.11826 15.4622 3.11826 15.4622 3.11826 15.4622ZM16.8821 15.4622C17.8818 14.2577 17.5389 12.429 16.8532 8.77153C16.3655 6.17055 16.1216 4.87006 15.1959 4.10175M16.8821 15.4622C16.8821 15.4622 16.8821 15.4622 16.8821 15.4622ZM15.1959 4.10175C14.2701 3.33345 12.947 3.33345 10.3007 3.33345H9.69971C7.0534 3.33345 5.73025 3.33345 4.8045 4.10175M15.1959 4.10175C15.1959 4.10175 15.1959 4.10175 15.1959 4.10175ZM4.8045 4.10175C4.8045 4.10175 4.8045 4.10175 4.8045 4.10175Z"
                  stroke="#C09C6C"
                  strokeWidth="1.5"
                />
                <path
                  d="M7.64258 6.66678C7.98578 7.63778 8.91181 8.33345 10.0003 8.33345C11.0888 8.33345 12.0149 7.63778 12.3581 6.66678"
                  stroke="#C09C6C"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              This Week&apos;s
            </span>
            <h2 className="font-semibold text-xl xl:text-heading-5 text-dark">
              New Arrivals
            </h2>
          </div>

          <Link
            href="/shop-with-sidebar"
            className="inline-flex font-medium text-custom-sm py-2.5 px-7 rounded-md border-gray-3 border bg-gray-1 text-dark ease-out duration-200 hover:bg-dark hover:text-white hover:border-transparent"
          >
            View All
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
          </div>
        )}

        {!loading && data.products.length > 0 && (
          <ProductCarousel products={data.products.slice(0, 8)} />
        )}

        {/* No products message */}
        {!loading && data.products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-xl font-semibold text-dark mb-2">
              No New Arrivals
            </h3>
            <p className="text-body">Check back soon for new products</p>
          </div>
        )}
      </div>
    </section>
  );
});

NewArrival.displayName = "NewArrival";

type ProductCarouselProps = {
  products: Product[];
};

const ProductCarousel = React.memo(({ products }: ProductCarouselProps) => {
  const cardsVisibleOnLarge = 4;
  const cardGapPx = 30;
  const [visibleCards, setVisibleCards] = useState(() =>
    determineVisibleCount(
      cardsVisibleOnLarge,
      typeof window !== "undefined" ? window.innerWidth : 0
    )
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const productIdsKey = products.map((product) => product.id).join(",");

  const maxShiftIndex = Math.max(0, products.length - visibleCards);

  useEffect(() => {
    const handleResize = () => {
      const width = typeof window !== "undefined" ? window.innerWidth : 0;
      const nextVisible = determineVisibleCount(cardsVisibleOnLarge, width);
      setVisibleCards(nextVisible);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [products.length, visibleCards, maxShiftIndex]);

  const measureCardWidth = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCardWidth(rect.width);
    }
  }, []);

  useLayoutEffect(() => {
    measureCardWidth();
  }, [measureCardWidth, productIdsKey, visibleCards]);

  useEffect(() => {
    const handleResize = () => {
      measureCardWidth();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measureCardWidth]);

  const autoAdvanceDelay = 4500;

  useEffect(() => {
    if (maxShiftIndex === 0) return undefined;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev >= maxShiftIndex ? 0 : prev + 1));
    }, autoAdvanceDelay);

    return () => clearInterval(interval);
  }, [maxShiftIndex]);

  if (!products.length) {
    return null;
  }

  const defaultCardWidth = `calc((100% - ${
    (visibleCards - 1) * cardGapPx
  }px) / ${visibleCards})`;
  const stepDistance = cardWidth ? cardWidth + cardGapPx : 0;
  const translateX = stepDistance * activeIndex;
  const canShiftLeft = activeIndex > 0;
  const canShiftRight = activeIndex < maxShiftIndex;

  const handleShift = (direction: "left" | "right") => {
    setActiveIndex((prev) => {
      if (direction === "left") {
        return Math.max(prev - 1, 0);
      }
      return Math.min(prev + 1, maxShiftIndex);
    });
  };

  return (
    <div className="relative p-2 overflow-hidden">
      <button
        type="button"
        aria-label="Show previous products"
        disabled={!canShiftLeft}
        onClick={() => handleShift("left")}
        className="absolute left-1 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-gray-200 bg-gray-2/80 text-dark transition hover:border-dark hover:bg-gray-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100"
      >
        <span className="text-xl">&#8249;</span>
      </button>
      <button
        type="button"
        aria-label="Show more products"
        disabled={!canShiftRight}
        onClick={() => handleShift("right")}
        className="absolute right-1 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-gray-200 bg-gray-2/80 text-dark transition hover:border-dark hover:bg-gray-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100"
      >
        <span className="text-xl">&#8250;</span>
      </button>
      <div
        className="flex transition-transform duration-700  ease-in-out"
        style={{
          gap: `${cardGapPx}px`,
          transform: `translateX(-${translateX}px)`,
        }}
      >
        {products.map((item, index) => (
          <div
            key={item.id}
            className="flex-none"
            ref={index === 0 ? cardRef : null}
            style={{
              width: cardWidth ? `${cardWidth}px` : defaultCardWidth,
            }}
          >
            <ProductItem item={item} hoverActions />
          </div>
        ))}
      </div>
    </div>
  );
});

ProductCarousel.displayName = "ProductCarousel";

function determineVisibleCount(maxCount: number, width: number) {
  if (width >= 1280) {
    return maxCount;
  }
  if (width >= 1024) {
    return Math.min(maxCount, 4);
  }
  if (width >= 640) {
    return Math.min(maxCount, 2);
  }
  return 1;
}

export default NewArrival;
