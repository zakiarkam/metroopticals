"use client";
import React, { useEffect, useMemo, useState } from "react";

import { useModalContext } from "@/app/context/QuickViewModalContext";
import { AppDispatch, useAppSelector } from "@/store/store";
import { useDispatch } from "react-redux";
import Image from "next/image";
import { usePreviewSlider } from "@/app/context/PreviewSliderContext";
import { updateproductDetails } from "@/store/features/product-details";
import Link from "next/link";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useCart } from "@/features/cart/hooks/use-cart";
import {
  getProductCatalogueUrl,
  normalizeImageArray,
} from "@/lib/storageUtils";
import { toast } from "react-hot-toast";
import { getUnitLabel, resolveDisplayPrice } from "@/lib/utils/price";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const QuickViewModal = () => {
  const { isModalOpen, closeModal } = useModalContext();
  const { openPreviewModal } = usePreviewSlider();
  const { isAuthenticated, addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const dispatch = useDispatch<AppDispatch>();

  const product = useAppSelector((state) => state.quickViewReducer.value);
  const { addToWishlist, isInWishlist } = useWishlist();

  const [activePreview, setActivePreview] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const normalizedImages = useMemo(() => {
    const normalized = normalizeImageArray(product?.images ?? []);
    return normalized.length > 0
      ? normalized
      : ["/images/placeholder-product.jpg"];
  }, [product?.images]);

  const productImages = normalizedImages;
  const thumbnailImages = normalizedImages;
  const previewImage = normalizedImages[activePreview] || normalizedImages[0];
  const catalogueUrl = getProductCatalogueUrl(product.catalogueFile);

  useEffect(() => {
    if (activePreview >= normalizedImages.length) {
      setActivePreview(0);
    }
  }, [normalizedImages.length, activePreview]);

  const canViewDiscount = useDiscountVisibility();
  const { displayPrice, hasDiscount, discountPercent } = resolveDisplayPrice(
    product.price || 0,
    product.discountedPrice ?? null,
    canViewDiscount
  );
  const unitLabel = getUnitLabel(product.unitType);

  // Check stock availability
  const isInStock = (product.stock ?? 0) > 0;
  const isActive = product.status === "ACTIVE";
  const canPurchase = isInStock && isActive;
  const maxQuantity = product.stock || 1;

  useEffect(() => {
    // Reset state when modal closes
    if (!isModalOpen) {
      setQuantity(1);
      setActivePreview(0);
      setIsDescriptionExpanded(false);
    }
  }, [isModalOpen]);

  // Don't render if no product data
  if (!product.id || !isModalOpen) {
    return null;
  }

  // preview modal
  const handlePreviewSlider = () => {
    dispatch(updateproductDetails(product));
    openPreviewModal();
  };

  // add to cart
  const handleAddToCart = async () => {
    if (!canPurchase || quantity === 0 || !product.id) return;

    const imagesForCart =
      product.images && product.images.length > 0
        ? product.images
        : productImages;

    const added = await addToCart(
      {
        id: product.id,
        title: product.title || "",
        price: product.price || 0,
        discountedPrice: product.discountedPrice || product.price || 0,
        images: imagesForCart,
        stock: product.stock ?? 0,
      },
      quantity
    );

    if (added) {
      closeModal();
    }
  };

  const handleAddToWishlist = async () => {
    if (!product?.id) return;

    await addToWishlist({
      id: product.id,
      title: product.title || "",
      price: product.price || 0,
      discountedPrice: product.discountedPrice || product.price || 0,
      images: productImages,
      stock: product.stock || 0,
    });
  };

  const alreadyInWishlist = isInWishlist(product.id);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxQuantity) {
      toast.error("Maximum stock reached");
      return;
    }
    setQuantity(newQuantity);
  };

  return (
    <Dialog
      open={isModalOpen && !!product.id}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-[1100px] max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            {/* Left side - Image Gallery */}
            <div className="w-full lg:w-1/2">
              <div className="flex gap-4">
                {/* Thumbnails */}
                {thumbnailImages.length > 1 && (
                  <div className="flex flex-col gap-3 w-20">
                    {thumbnailImages.map((img, key) => (
                      <button
                        onClick={() => setActivePreview(key)}
                        key={key}
                        className={`group flex items-center justify-center w-20 h-20 overflow-hidden rounded-lg bg-blue/5 transition-all duration-200 hover:ring-2 hover:ring-blue/50 ${
                          activePreview === key && "ring-2 ring-blue"
                        }`}
                      >
                        <Image
                          src={img || "/images/placeholder-product.jpg"}
                          alt="thumbnail"
                          width={61}
                          height={61}
                          className="aspect-square object-contain transition-transform group-hover:scale-110"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Preview */}
                <div className="relative flex-1 overflow-hidden flex items-center justify-center min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  {productImages.length > 0 ? (
                    <Image
                      src={
                        productImages[activePreview] ||
                        "/images/placeholder-product.jpg"
                      }
                      alt={product.title}
                      width={500}
                      height={500}
                      className="object-contain p-4"
                    />
                  ) : (
                    <div className="flex items-center justify-center text-gray-400">
                      No image available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Product Details */}
            <div className="w-full lg:w-1/2">
              {hasDiscount && discountPercent !== null && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-white py-1.5 px-3 bg-green rounded-md mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      fill="white"
                    />
                  </svg>
                  SALE {discountPercent}% OFF
                </span>
              )}

              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold capitalize text-dark hover:text-blue transition-colors cursor-pointer">
                  <Link
                    href={`/shop-details/${product.id}`}
                    onClick={closeModal}
                  >
                    {product.title}
                  </Link>
                </DialogTitle>
              </DialogHeader>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-4">
                {product.status === "INACTIVE" ? (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange/20">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M10 2L12.39 7.26H18L13.81 11.22L15.17 16.39L10 12.43L4.83 16.39L6.19 11.22L2 7.26H7.61L10 2Z"
                          fill="#F59E0B"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-orange">
                      Inactive
                    </span>
                  </>
                ) : product.status === "OUT_OF_STOCK" ? (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red/20">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M6 6L14 14M14 6L6 14"
                          stroke="#DC2626"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-red">
                      Out of Stock
                    </span>
                  </>
                ) : isInStock ? (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green/20">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M7 10L9 12L13 8"
                          stroke="#34C77B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green">
                      In Stock
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red/20">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M6 6L14 14M14 6L6 14"
                          stroke="#DC2626"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-red">
                      Out of Stock
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {(() => {
                    const description =
                      product.description || "No description available";
                    const maxLength = 150;
                    const shouldTruncate = description.length > maxLength;

                    if (!shouldTruncate) {
                      return description;
                    }

                    if (isDescriptionExpanded) {
                      return description;
                    }

                    return `${description.slice(0, maxLength)}...`;
                  })()}
                </p>
                {product.description && product.description.length > 150 && (
                  <button
                    onClick={() =>
                      setIsDescriptionExpanded(!isDescriptionExpanded)
                    }
                    className="mt-2 text-sm font-medium text-blue hover:text-blue-dark transition-colors inline-flex items-center gap-1"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        Show less
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M18 15L12 9L6 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        Read more
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M6 9L12 15L18 9"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Catalogue Link */}
              {catalogueUrl && isAuthenticated && (
                <a
                  href={catalogueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue border border-blue/30 py-2 px-4 rounded-lg hover:bg-blue/10 transition-colors mb-6"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2V8H20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  View Catalogue
                </a>
              )}

              {/* Price & Quantity */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Price ({" "}
                    <span className="text-sm text-body">{unitLabel}</span> )
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-dark">
                      Rs.{displayPrice?.toFixed(2) || "0.00"}
                    </span>
                    {hasDiscount && product.price && (
                      <span className="text-sm font-medium text-gray-400 line-through">
                        Rs.{product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Quantity
                  </h4>
                  <div className="inline-flex w-full max-w-[220px] items-center gap-2 bg-gray-2 rounded-lg border border-gray-200 p-1 sm:w-auto sm:max-w-none">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      aria-label="Decrease quantity"
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-dark transition-all hover:bg-gray-200 hover:text-blue disabled:opacity-50 disabled:cursor-not-allowed border border-gray-3"
                      disabled={quantity <= 1 || !isInStock}
                    >
                      <svg width="12" height="2" viewBox="0 0 16 2" fill="none">
                        <path
                          d="M0 1H16"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>

                    <span className="flex items-center justify-center min-w-[2.5rem] font-semibold text-dark">
                      {quantity}
                    </span>

                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      aria-label="Increase quantity"
                      className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-dark transition-all hover:bg-gray-200 hover:text-blue disabled:opacity-50 disabled:cursor-not-allowed border border-gray-3"
                      disabled={quantity >= maxQuantity || !isInStock}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 0V16M0 8H16"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled={!canPurchase || quantity === 0}
                  onClick={handleAddToCart}
                  className="group flex-1 inline-flex items-center justify-center gap-2 font-semibold text-white bg-blue py-2.5 px-5 rounded-lg transition-all hover:bg-blue-dark hover:scale-[1.02] hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-all group-hover:bg-white/30">
                    <svg
                      className="transition-transform group-hover:scale-110"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1.29266 2.7512C1.43005 2.36044 1.8582 2.15503 2.24896 2.29242L2.55036 2.39838C3.16689 2.61511 3.69052 2.79919 4.10261 3.00139C4.54324 3.21759 4.92109 3.48393 5.20527 3.89979C5.48725 4.31243 5.60367 4.76515 5.6574 5.26153L17.1203 5.36996C19.25 5.36996 20.75 5.8 21.3 6.24C21.7 6.73 21.78 7.31 21.74 7.9L20.8836 12.5033C20.35 15.25 20.1 16.25 16.2862 16.25H10.8804C7.7 16.25 5.5 16.25 4.2 14.07C3.8 13.3 3.7 12.2 3.7 9.7V7.03832C3.7 5.0 3.6 4.8 2.0 3.79934L1.75145 3.7075C1.36068 3.57012 1.15527 3.14197 1.29266 2.7512Z"
                        fill="white"
                      />
                    </svg>
                  </span>
                  {!isActive
                    ? "Inactive"
                    : isInStock
                      ? "Add to Cart"
                      : "Out of Stock"}
                </button>

                <button
                  onClick={handleAddToWishlist}
                  disabled={alreadyInWishlist}
                  className="group inline-flex items-center justify-center gap-2 font-semibold text-dark bg-gray-100 py-2.5 px-5 rounded-lg border-2 border-gray-200 transition-all hover:border-blue hover:bg-blue/5 hover:text-blue hover:scale-[1.02] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-dark/10 transition-all group-hover:bg-blue/20 group-disabled:bg-gray-300">
                    <svg
                      className="transition-transform group-hover:scale-110"
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.68698 3.68688C3.30449 4.31882 2.29169 5.82191 2.29169 7.6143C2.29169 9.44546 3.04103 10.8569 4.11526 12.0665C5.00062 13.0635 6.07238 13.8897 7.11763 14.6956C7.36588 14.8869 7.61265 15.0772 7.85506 15.2683C8.29342 15.6139 8.68445 15.9172 9.06136 16.1374C9.43847 16.3578 9.74202 16.4584 10 16.4584C10.258 16.4584 10.5616 16.3578 10.9387 16.1374C11.3156 15.9172 11.7066 15.6139 12.145 15.2683C12.3874 15.0772 12.6342 14.8869 12.8824 14.6956C13.9277 13.8897 14.9994 13.0635 15.8848 12.0665C16.959 10.8569 17.7084 9.44546 17.7084 7.6143C17.7084 5.82191 16.6955 4.31882 15.3131 3.68688C13.97 3.07295 12.1653 3.23553 10.4503 5.01733C10.3325 5.13974 10.1699 5.20891 10 5.20891C9.83012 5.20891 9.66754 5.13974 9.54972 5.01733C7.83474 3.23553 6.03008 3.07295 4.68698 3.68688Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  {alreadyInWishlist ? "In Wishlist" : "Add to Wishlist"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;
