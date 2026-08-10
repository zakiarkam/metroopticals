"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useModalContext } from "@/app/context/QuickViewModalContext";
import { updateQuickView } from "@/store/features/quickView-slice";
import { updateproductDetails } from "@/store/features/product-details";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { normalizeImageArray } from "@/lib/storageUtils";
import { getUnitLabel, resolveDisplayPrice } from "@/lib/utils/price";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";

type ProductItemData = {
  id: number;
  title: string;
  price: number;
  discountedPrice?: number | null;
  unitType?: string | null;
  reviews?: number;
  images?: string[];
  stock?: number;
  catalogueFile?: string | null;
  status?: string;
};

const SingleGridItem = ({ item }: { item: ProductItemData }) => {
  const { openModal } = useModalContext();
  const dispatch = useDispatch<AppDispatch>();
  const { addToCart, isAuthenticated } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSavingWishlist, setIsSavingWishlist] = useState(false);

  const resolvedImages = normalizeImageArray(item.images);
  const primaryImage =
    resolvedImages.length > 0
      ? resolvedImages[0]
      : "/images/placeholder-product.jpg";

  const handleQuickViewUpdate = () => {
    dispatch(updateQuickView({ ...item } as any));
  };

  const handleAddToWishlist = async () => {
    if (isSavingWishlist || isInWishlist(item.id)) return;

    setIsSavingWishlist(true);
    await addToWishlist({
      id: item.id,
      title: item.title,
      price: item.price,
      discountedPrice: item.discountedPrice ?? item.price,
      images: resolvedImages,
      stock: item.stock || 0,
    });
    setIsSavingWishlist(false);
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    await addToCart(
      {
        id: item.id,
        title: item.title,
        price: item.price,
        discountedPrice: item.discountedPrice ?? item.price,
        images: resolvedImages,
        stock: item.stock || 0,
      },
      1
    );
    setIsAddingToCart(false);
  };

  const handleProductDetails = () => {
    dispatch(updateproductDetails({ ...item } as any));
  };

  const canViewDiscount = useDiscountVisibility();
  const { displayPrice, hasDiscount, discountPercent } = resolveDisplayPrice(
    item.price,
    item.discountedPrice ?? null,
    canViewDiscount
  );
  const unitLabel = getUnitLabel(item.unitType);

  return (
    <div className="group">
      <div
        className="relative flex h-full flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white  transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
        onClick={() => {
          openModal();
          handleQuickViewUpdate();
        }}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-gray-50 p-3">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <Image
            src={primaryImage}
            alt={item.title}
            width={400}
            height={400}
            className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-lg"
          />

          <div
            className="absolute left-0 bottom-0 flex w-full translate-y-full items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToWishlist();
              }}
              aria-label="Add to wishlist"
              disabled={isSavingWishlist || isInWishlist(item.id)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-white/95 text-dark shadow-lg backdrop-blur-sm transition hover:border-blue hover:bg-white hover:text-blue disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                className="fill-current"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.74953 2.94942C2.64354 3.45498 1.83329 4.65745 1.83329 6.09136C1.83329 7.55629 2.43277 8.68545 3.29214 9.65314C4.00043 10.4506 4.85784 11.1118 5.69404 11.7564C5.89265 11.9094 6.09005 12.0616 6.28398 12.2145C6.63467 12.491 6.9475 12.7336 7.24903 12.9099C7.55071 13.0861 7.79356 13.1666 7.99995 13.1666C8.20635 13.1666 8.4492 13.0861 8.75088 12.9099C9.05241 12.7336 9.36524 12.491 9.71592 12.2145C9.90985 12.0616 10.1073 11.9094 10.3059 11.7564C11.1421 11.1118 11.9995 10.4506 12.7078 9.65314C13.5671 8.68545 14.1666 7.55629 14.1666 6.09136C14.1666 4.65745 13.3564 3.45498 12.2504 2.94942C11.176 2.45828 9.73226 2.58835 8.36028 4.01378C8.26601 4.1117 8.13595 4.16705 8.00003 4.16705C7.86411 4.16705 7.73405 4.1117 7.63979 4.01378C6.2678 2.58835 4.82407 2.45828 3.74953 2.94942ZM8.00003 2.97251C6.45865 1.59346 4.73266 1.40053 3.33386 2.03993C1.8565 2.71523 0.833374 4.28331 0.833374 6.09136C0.833374 7.86838 1.5737 9.22399 2.54451 10.3172C3.32194 11.1926 4.27352 11.9252 5.11392 12.5724C5.30443 12.7191 5.48922 12.8614 5.66497 12.9998C6.00648 13.269 6.37306 13.5561 6.74458 13.7732C7.11593 13.9902 7.53976 14.1666 8.00003 14.1666C8.46029 14.1666 8.88412 13.9902 9.25548 13.7732C9.627 13.5561 9.99359 13.269 10.3351 12.9998C10.5108 12.8614 10.6956 12.7191 10.8861 12.5724C11.7265 11.9252 12.6781 11.1926 13.4556 10.3172C14.4264 9.22399 15.1667 7.86838 15.1667 6.09136C15.1667 4.28331 14.1436 2.71523 12.6662 2.03993C11.2674 1.40053 9.54143 1.59346 8.00003 2.97251Z"
                  fill=""
                />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openModal();
                handleQuickViewUpdate();
              }}
              aria-label="Quick view"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-white/95 text-dark shadow-lg backdrop-blur-sm transition hover:border-blue hover:bg-white hover:text-blue"
            >
              <svg
                className="fill-current"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.00016 5.5C6.61945 5.5 5.50016 6.61929 5.50016 8C5.50016 9.38071 6.61945 10.5 8.00016 10.5C9.38087 10.5 10.5002 9.38071 10.5002 8C10.5002 6.61929 9.38087 5.5 8.00016 5.5ZM6.50016 8C6.50016 7.17157 7.17174 6.5 8.00016 6.5C8.82859 6.5 9.50016 7.17157 9.50016 8C9.50016 8.82842 8.82859 9.5 8.00016 9.5C7.17174 9.5 6.50016 8.82842 6.50016 8Z"
                  fill=""
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.00016 2.16666C4.99074 2.16666 2.96369 3.96946 1.78721 5.49791L1.76599 5.52546C1.49992 5.87102 1.25487 6.18928 1.08862 6.5656C0.910592 6.96858 0.833496 7.40779 0.833496 8C0.833496 8.5922 0.910592 9.03142 1.08862 9.4344C1.25487 9.81072 1.49992 10.129 1.76599 10.4745L1.78721 10.5021C2.96369 12.0305 4.99074 13.8333 8.00016 13.8333C11.0096 13.8333 13.0366 12.0305 14.2131 10.5021L14.2343 10.4745C14.5004 10.129 14.7455 9.81072 14.9117 9.4344C15.0897 9.03142 15.1668 8.5922 15.1668 8C15.1668 7.40779 15.0897 6.96858 14.9117 6.5656C14.7455 6.18927 14.5004 5.87101 14.2343 5.52545L14.2131 5.49791C13.0366 3.96946 11.0096 2.16666 8.00016 2.16666ZM2.57964 6.10786C3.66592 4.69661 5.43374 3.16666 8.00016 3.16666C10.5666 3.16666 12.3344 4.69661 13.4207 6.10786C13.7131 6.48772 13.8843 6.7147 13.997 6.9697C14.1023 7.20801 14.1668 7.49929 14.1668 8C14.1668 8.50071 14.1023 8.79199 13.997 9.0303C13.8843 9.28529 13.7131 9.51227 13.4207 9.89213C12.3344 11.3034 10.5666 12.8333 8.00016 12.8333C5.43374 12.8333 3.66592 11.3034 2.57964 9.89213C2.28725 9.51227 2.11599 9.28529 2.00334 9.0303C1.89805 8.79199 1.8335 8.50071 1.8335 8C1.8335 7.49929 1.89805 7.20801 2.00334 6.9697C2.11599 6.7147 2.28725 6.48772 2.57964 6.10786Z"
                  fill=""
                />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={
                isAddingToCart || !item.stock || item.status !== "ACTIVE"
              }
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-blue px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAddingToCart
                ? "Adding..."
                : item.status === "INACTIVE"
                  ? "Inactive"
                  : item.status === "OUT_OF_STOCK"
                    ? "Out of Stock"
                    : !item.stock
                      ? "Out of Stock"
                      : "Add to cart"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 pb-2 pt-2">
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.4em]">
            <span
              className={`${
                item.status === "INACTIVE"
                  ? "text-orange-600"
                  : item.status === "OUT_OF_STOCK"
                    ? "text-red-600"
                    : item.stock
                      ? "text-green-600"
                      : "text-red-600"
              }`}
            >
              {item.status === "INACTIVE"
                ? "Inactive"
                : item.status === "OUT_OF_STOCK"
                  ? "Out of Stock"
                  : item.stock
                    ? "In Stock"
                    : "Out of Stock"}
            </span>
            {hasDiscount && discountPercent && (
              <span className="text-emerald-600">{`${discountPercent}% OFF`}</span>
            )}
          </div>

          <h3
            className="min-h-[3rem] text-base font-semibold capitalize leading-6 text-dark line-clamp-2 break-words transition duration-200 hover:text-blue cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleProductDetails();
            }}
          >
            <Link href={`/shop-details/${item.id}`}>{item.title}</Link>
          </h3>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold text-dark">
              Rs {displayPrice}.00
            </span>
            {/* <span className="text-xs text-body">{unitLabel}</span> */}
            {hasDiscount && (
              <span className="text-sm font-semibold uppercase text-dark-4 line-through">
                Rs {item.price}.00
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleGridItem;
