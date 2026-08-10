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
import {
  getProductCatalogueUrl,
  normalizeImageArray,
} from "@/lib/storageUtils";
import { getUnitLabel, resolveDisplayPrice } from "@/lib/utils/price";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";

type ProductItemData = {
  id: number;
  title: string;
  description?: string;
  price: number;
  discountedPrice?: number | null;
  unitType?: string | null;
  reviews?: number;
  images?: string[];
  stock?: number;
  catalogueFile?: string | null;
  status?: string;
};

const SingleListItem = ({ item }: { item: ProductItemData }) => {
  const { openModal } = useModalContext();
  const dispatch = useDispatch<AppDispatch>();
  const { addToCart, isAuthenticated } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const resolvedImages = normalizeImageArray(item.images);
  const primaryImage =
    resolvedImages.length > 0
      ? resolvedImages[0]
      : "/images/placeholder-product.jpg";
  const catalogueUrl = getProductCatalogueUrl(item.catalogueFile);

  const handleQuickViewUpdate = () => {
    dispatch(updateQuickView({ ...item } as any));
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
  const { displayPrice, hasDiscount } = resolveDisplayPrice(
    item.price,
    item.discountedPrice ?? null,
    canViewDiscount
  );
  const unitLabel = getUnitLabel(item.unitType);

  return (
    <div
      className="bg-white rounded-lg shadow-1 p-4 cursor-pointer hover:shadow-2 transition-shadow"
      onClick={() => {
        openModal();
        handleQuickViewUpdate();
      }}
    >
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Product Image */}
        <div className="sm:max-w-[200px] w-full flex-shrink-0">
          <div className="relative overflow-hidden flex items-center justify-center rounded-lg bg-[#F6F7FB] aspect-square">
            <Image
              src={primaryImage}
              alt={item.title}
              width={200}
              height={200}
              className="object-cover"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 flex flex-col">
          {/* <div className="flex items-center gap-2.5 mb-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Image
                  key={i}
                  src="/images/icons/icon-star.svg"
                  alt="star"
                  width={14}
                  height={14}
                />
              ))}
            </div>
            <p className="text-custom-sm">({item.reviews || 0})</p>
          </div> */}

          <h3
            className="font-medium capitalize text-xl text-dark ease-out duration-200 hover:text-blue mb-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleProductDetails();
            }}
          >
            <Link href={`/shop-details/${item.id}`}>{item.title}</Link>
          </h3>

          {item.description && (
            <p className="text-custom-sm text-body mb-4 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 font-medium text-lg">
                <span className="text-dark">Rs - {displayPrice}.00</span>
                {/* <span className="text-xs text-body">{unitLabel}</span> */}
                {hasDiscount && (
                  <span className="text-dark-4 line-through">
                    Rs - {item.price}.00
                  </span>
                )}
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
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
              {catalogueUrl && isAuthenticated && (
                <a
                  href={catalogueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue hover:underline"
                >
                  View product catalogue
                </a>
              )}
            </div>

            <div
              className="flex items-center gap-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModal();
                  handleQuickViewUpdate();
                }}
                aria-label="Quick view"
                className="flex items-center justify-center w-9 h-9 rounded-[5px] shadow-1 ease-out duration-200 text-dark bg-gray-1 hover:text-blue hover:bg-white"
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
                className="inline-flex font-medium text-custom-sm py-2.5 px-5 rounded-[5px] bg-blue text-white ease-out duration-200 hover:bg-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
};

export default SingleListItem;
