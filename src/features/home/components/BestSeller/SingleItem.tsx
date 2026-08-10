"use client";
import React from "react";
import { useModalContext } from "@/app/context/QuickViewModalContext";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { updateQuickView } from "@/store/features/quickView-slice";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import Image from "next/image";
import Link from "next/link";
import { getProductImageUrl } from "@/lib/storageUtils";
import type { TopProduct } from "@/features/dashboard/types/dashboard";
import { useState } from "react";
import { getUnitLabel, resolveDisplayPrice } from "@/lib/utils/price";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";

type ProductData = TopProduct & {
  title?: string;
  description?: string;
  unitType?: string | null;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};

const SingleItem = React.memo(({ item }: { item: ProductData }) => {
  const { openModal } = useModalContext();
  const dispatch = useDispatch<AppDispatch>();
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSavingWishlist, setIsSavingWishlist] = useState(false);
  const normalizeImages = (values?: string[] | null | undefined) =>
    (values ?? [])
      .map((value) => getProductImageUrl(value))
      .filter((value): value is string => Boolean(value));

  const resolvedImages = (() => {
    const fromImages = normalizeImages(item.images);
    if (fromImages.length) return fromImages;
    const fromPreviews = normalizeImages(item.imgs?.previews);
    if (fromPreviews.length) return fromPreviews;
    const fromThumbnails = normalizeImages(item.imgs?.thumbnails);
    if (fromThumbnails.length) return fromThumbnails;
    return [];
  })();

  const primaryImage = resolvedImages[0] || "/images/placeholder-product.jpg";

  const imagePayload = {
    previews: resolvedImages,
    thumbnails: resolvedImages,
  };

  const displayTitle = item.title ?? item.name ?? "Product";
  const truncatedTitle =
    displayTitle.length > 18 ? `${displayTitle.slice(0, 18)}...` : displayTitle;
  const categoryName = item.category ?? "Uncategorized";

  // Trim description to ~100 characters for card display
  const displayDescription = item.description
    ? item.description.length > 100
      ? `${item.description.slice(0, 100)}...`
      : item.description
    : "";

  const canViewDiscount = useDiscountVisibility();
  const { displayPrice, hasDiscount } = resolveDisplayPrice(
    item.price,
    item.discountedPrice ?? null,
    canViewDiscount
  );
  const unitLabel = getUnitLabel(item.unitType);

  // update the QuickView state
  const handleQuickViewUpdate = () => {
    dispatch(updateQuickView({ ...item, title: displayTitle } as any));
  };

  // add to cart with loading state
  const handleAddToCart = async () => {
    if (isAddingToCart || !item.stock) return;

    setIsAddingToCart(true);
    await addToCart(
      {
        id: item.id,
        title: displayTitle,
        price: item.price,
        discountedPrice: item.discountedPrice ?? item.price,
        images: item.images ?? resolvedImages,
        stock: item.stock ?? 0,
      },
      1
    );
    setIsAddingToCart(false);
  };

  // add to wishlist with loading state
  const handleAddToWishlist = async () => {
    if (isSavingWishlist || isInWishlist(item.id)) return;

    setIsSavingWishlist(true);
    await addToWishlist({
      id: item.id,
      title: displayTitle,
      price: item.price,
      discountedPrice: item.discountedPrice ?? item.price,
      images: resolvedImages,
      stock: item.stock || 0,
    });
    setIsSavingWishlist(false);
  };

  return (
    <div className="w-full">
      <div
        className="group overflow-hidden rounded-[2px] bg-white shadow-md ring-1 ring-[#F6F7FB] transition-all duration-500 ease-in-out hover:-translate-y-1 hover:ring-2 hover:ring-[#fbfcff]/20 cursor-pointer"
        onClick={() => {
          openModal();
          handleQuickViewUpdate();
        }}
      >
        <div className="relative h-[280px] rounded-t-[2px] bg-[#fbfcff] p-2">
          <div className="relative h-full rounded-[2px] bg-[#fbfcff] overflow-hidden">
            <div
              className="absolute right-4 top-4 flex items-center gap-3 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  openModal();
                  handleQuickViewUpdate();
                }}
                aria-label="Open quick view"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-blue text-white shadow-lg opacity-0 scale-75 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 hover:bg-blue/90 hover:border-white hover:shadow-xl hover:scale-110 active:scale-95"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className="fill-current"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.00016 5.5C6.61945 5.5 5.50016 6.61929 5.50016 8C5.50016 9.38071 6.61945 10.5 8.00016 10.5C9.38087 10.5 10.5002 9.38071 10.5002 8C10.5002 6.61929 9.38087 5.5 8.00016 5.5ZM6.50016 8C6.50016 7.17157 7.17174 6.5 8.00016 6.5C8.82859 6.5 9.50016 7.17157 9.50016 8C9.50016 8.82842 8.82859 9.5 8.00016 9.5C7.17174 9.5 6.50016 8.82842 6.50016 8Z"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.00016 2.16666C4.99074 2.16666 2.96369 3.96946 1.78721 5.49791L1.76599 5.52546C1.49992 5.87102 1.25487 6.18928 1.08862 6.5656C0.910592 6.96858 0.833496 7.40779 0.833496 8C0.833496 8.5922 0.910592 9.03142 1.08862 9.4344C1.25487 9.81072 1.49992 10.129 1.76599 10.4745L1.78721 10.5021C2.96369 12.0305 4.99074 13.8333 8.00016 13.8333C11.0096 13.8333 13.0366 12.0305 14.2131 10.5021L14.2343 10.4745C14.5004 10.129 14.7455 9.81072 14.9117 9.4344C15.0897 9.03142 15.1668 8.5922 15.1668 8C15.1668 7.40779 15.0897 6.96858 14.9117 6.5656C14.7455 6.18927 14.5004 5.87101 14.2343 5.52545L14.2131 5.49791C13.0366 3.96946 11.0096 2.16666 8.00016 2.16666ZM2.57964 6.10786C3.66592 4.69661 5.43374 3.16666 8.00016 3.16666C10.5666 3.16666 12.3344 4.69661 13.4207 6.10786C13.7131 6.48772 13.8843 6.7147 13.997 6.9697C14.1023 7.20801 14.1668 7.49929 14.1668 8C14.1668 8.50071 14.1023 8.79199 13.997 9.0303C13.8843 9.28529 13.7131 9.51227 13.4207 9.89213C12.3344 11.3034 10.5666 12.8333 8.00016 12.8333C5.43374 12.8333 3.66592 11.3034 2.57964 9.89213C2.28725 9.51227 2.11599 9.28529 2.00334 9.0303C1.89805 8.79199 1.8335 8.50071 1.8335 8C1.8335 7.49929 1.89805 7.20801 2.00334 6.9697C2.11599 6.7147 2.28725 6.48772 2.57964 6.10786Z"
                  />
                </svg>
              </button>
              <button
                onClick={handleAddToWishlist}
                aria-label="Add to wishlist"
                disabled={isSavingWishlist || isInWishlist(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-blue text-white shadow-lg opacity-0 scale-75 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 hover:bg-red hover:border-white hover:shadow-xl hover:scale-110 active:scale-95 disabled:bg-red/50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className="fill-current"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.00003 2.97251C6.45865 1.59346 4.73266 1.40053 3.33386 2.03993C1.8565 2.71523 0.833374 4.28331 0.833374 6.09136C0.833374 7.86838 1.5737 9.22399 2.54451 10.3172C3.32194 11.1926 4.27352 11.9252 5.11392 12.5724C5.30443 12.7191 5.48922 12.8614 5.66497 12.9998C6.00648 13.269 6.37306 13.5561 6.74458 13.7732C7.11593 13.9902 7.53976 14.1666 8.00003 14.1666C8.46029 14.1666 8.88412 13.9902 9.25548 13.7732C9.627 13.5561 9.99359 13.269 10.3351 12.9998C10.5108 12.8614 10.6956 12.7191 10.8861 12.5724C11.7265 11.9252 12.6781 11.1926 13.4556 10.3172C14.4264 9.22399 15.1667 7.86838 15.1667 6.09136C15.1667 4.28331 14.1436 2.71523 12.6662 2.03993C11.2674 1.40053 9.54143 1.59346 8.00003 2.97251Z"
                  />
                </svg>
              </button>
            </div>
            <div className="flex h-full w-full items-center justify-center">
              <Image
                src={primaryImage}
                alt={displayTitle}
                width={400}
                height={400}
                className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </div>
        </div>
        <div className="relative -mt-10 rounded-t-[2px] bg-white px-6 pb-6 pt-6 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.3em] text-[#8D93A5]">
            <span>{categoryName}</span>
          </div>
          <h3 className="text-xl -mt-2 font-semibold capitalize text-dark">
            <Link href={`/shop-details/${item.id}`}>{truncatedTitle}</Link>
          </h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[18px] font-semibold text-dark">
              Rs {displayPrice}.00
            </span>
            {/* <span className="text-xs text-body">{unitLabel}</span> */}
            {hasDiscount && (
              <span className="text-sm font-medium text-dark-4 line-through">
                Rs {item.price}.00
              </span>
            )}
          </div>
          <p
            className="mt-2 text-sm leading-6 text-body min-h-[48px]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayDescription}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={isAddingToCart || item.status !== "ACTIVE" || !item.stock}
            className="mt-2 w-full rounded-sm bg-blue py-1 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isAddingToCart
              ? "Adding..."
              : item.status === "INACTIVE"
                ? "Inactive"
                : item.status === "OUT_OF_STOCK" || !item.stock
                  ? "Out of Stock"
                  : "Add To My Cart"}
          </button>
        </div>
      </div>
    </div>
  );
});

SingleItem.displayName = "BestSellerSingleItem";

export default SingleItem;
