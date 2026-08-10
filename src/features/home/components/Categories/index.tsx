"use client";
import React, { useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import Link from "next/link";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { getCategoryImageUrl } from "@/lib/storageUtils";

// Import Swiper styles
import "swiper/css/navigation";
import "swiper/css";

type Category = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
};

const SingleItem = React.memo(({ item }: { item: Category }) => {
  const imageUrl = getCategoryImageUrl(item.image);

  return (
    <Link
      href={`/shop-without-sidebar?category=${item.slug}`}
      className="group flex w-full flex-col items-center gap-3 px-3 py-4 text-center transition-all duration-300 hover:-translate-y-1 sm:px-5 sm:py-6"
    >
      <div className="relative flex w-28 items-center justify-center rounded-full bg-white p-1 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-4 bg-white">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${item.name} category`}
              width={96}
              height={96}
              sizes="(max-width: 768px) 80vw, 96px"
              className="object-contain p-2"
            />
          ) : (
            <span className="text-3xl font-semibold text-gray-400">
              {item.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm sm:text-md capitalize font-semibold text-dark group-hover:text-blue line-clamp-2 max-w-full sm:max-w-[160px] text-center break-words">
        {item.name}
      </p>
      <p className="text-[9px] sm:text-[10px] -mt-2 font-semibold tracking-[0.2em] sm:tracking-[0.3em] text-gray-400">
        {item.productCount ? `${item.productCount} PRODUCTS` : "NO PRODUCTS"}
      </p>
    </Link>
  );
});

SingleItem.displayName = "CategoryItem";

const Categories = React.memo(() => {
  const sliderRef = useRef(null);
  const { categories, loading, error } = useCategories();
  const parentCategories = categories.filter((category) => !category.parentId);

  const handlePrev = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.swiper.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.swiper.slideNext();
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.swiper.init();
    }
  }, []);

  if (loading) {
    return (
      <section className="overflow-hidden pt-8">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pb-8 border-b border-gray-3">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error || parentCategories.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden pt-8">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pb-8">
        <div className="swiper categories-carousel common-carousel">
          {/* <!-- section title --> */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="flex items-center gap-2.5 font-medium text-dark mb-1.5">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_834_7356)">
                    <path
                      d="M3.94024 13.4474C2.6523 12.1595 2.00832 11.5155 1.7687 10.68C1.52908 9.84449 1.73387 8.9571 2.14343 7.18231L2.37962 6.15883C2.72419 4.66569 2.89648 3.91912 3.40771 3.40789C3.91894 2.89666 4.66551 2.72437 6.15865 2.3798L7.18213 2.14361C8.95692 1.73405 9.84431 1.52927 10.6798 1.76889C11.5153 2.00851 12.1593 2.65248 13.4472 3.94042L14.9719 5.46512C17.2128 7.70594 18.3332 8.82635 18.3332 10.2186C18.3332 11.6109 17.2128 12.7313 14.9719 14.9721C12.7311 17.2129 11.6107 18.3334 10.2184 18.3334C8.82617 18.3334 7.70576 17.2129 5.46494 14.9721L3.94024 13.4474Z"
                      stroke="#3C50E0"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="7.17245"
                      cy="7.39917"
                      r="1.66667"
                      transform="rotate(-45 7.17245 7.39917)"
                      stroke="#3C50E0"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M9.61837 15.4164L15.4342 9.6004"
                      stroke="#3C50E0"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_834_7356">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                Categories
              </span>
              <h2 className="font-semibold text-xl xl:text-heading-5 text-dark">
                Browse by Category
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePrev} className="swiper-button-prev">
                <svg
                  className="fill-current"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.4881 4.43057C15.8026 4.70014 15.839 5.17361 15.5694 5.48811L9.98781 12L15.5694 18.5119C15.839 18.8264 15.8026 19.2999 15.4881 19.5695C15.1736 19.839 14.7001 19.8026 14.4306 19.4881L8.43056 12.4881C8.18981 12.2072 8.18981 11.7928 8.43056 11.5119L14.4306 4.51192C14.7001 4.19743 15.1736 4.161 15.4881 4.43057Z"
                    fill=""
                  />
                </svg>
              </button>

              <button onClick={handleNext} className="swiper-button-next">
                <svg
                  className="fill-current"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.51192 4.43057C8.82641 4.161 9.29989 4.19743 9.56946 4.51192L15.5695 11.5119C15.8102 11.7928 15.8102 12.2072 15.5695 12.4881L9.56946 19.4881C9.29989 19.8026 8.82641 19.839 8.51192 19.5695C8.19743 19.2999 8.161 18.8264 8.43057 18.5119L14.0122 12L8.43057 5.48811C8.161 5.17361 8.19743 4.70014 8.51192 4.43057Z"
                    fill=""
                  />
                </svg>
              </button>
            </div>
          </div>

          <Swiper
            ref={sliderRef}
            slidesPerView={6}
            spaceBetween={20}
            breakpoints={{
              0: {
                slidesPerView: 1.4,
                spaceBetween: 12,
              },
              480: {
                slidesPerView: 2,
                spaceBetween: 12,
              },
              640: {
                slidesPerView: 3,
                spaceBetween: 15,
              },
              1000: {
                slidesPerView: 4,
                spaceBetween: 20,
              },
              1200: {
                slidesPerView: 6,
                spaceBetween: 20,
              },
            }}
          >
            {parentCategories.map((item, key) => (
              <SwiperSlide key={key}>
                <SingleItem item={item} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
});

Categories.displayName = "Categories";

export default Categories;
