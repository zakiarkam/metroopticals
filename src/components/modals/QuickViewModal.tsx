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
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { getAvailability } from "@/features/products/utils/availability";
import { normalizeColorOptions } from "@/features/products/utils/colors";
import ColorPicker from "@/features/products/components/shop-details/ColorPicker";

const money = (value?: number | null) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const QuickViewModal = () => {
  const { isModalOpen, closeModal } = useModalContext();
  const { openPreviewModal } = usePreviewSlider();
  const { isAuthenticated, addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");

  const dispatch = useDispatch<AppDispatch>();

  const product = useAppSelector((state) => state.quickViewReducer.value);
  const { addToWishlist, isInWishlist } = useWishlist();

  const [activePreview, setActivePreview] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const normalizedImages = useMemo(() => {
    const normalized = normalizeImageArray(product?.images ?? []);
    return normalized.length > 0
      ? normalized
      : ["/images/placeholder-product.svg"];
  }, [product?.images]);

  const colorOptions = useMemo(
    () => normalizeColorOptions(product?.frameColors),
    [product?.frameColors],
  );

  // Follows whichever product the modal was opened on, and pre-selects the
  // first colourway the same way the product page does.
  useEffect(() => {
    setSelectedColor(colorOptions[0] ?? "");
  }, [colorOptions]);

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
    canViewDiscount,
  );
  const unitLabel = getUnitLabel(product.unitType);

  // Stock availability, shared with the cards and the details page.
  const availability = getAvailability(product.status, product.stock);
  const canPurchase = availability.canBuy;
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
        frameColors: colorOptions,
      },
      quantity,
      selectedColor || undefined,
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
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border-gray-3 bg-gray-2 p-0 sm:max-w-[calc(100vw-3rem)] lg:max-w-[980px]">
        <div className="grid gap-0 lg:grid-cols-2">
          {/* ========================= gallery ========================= */}
          <div className="border-b border-gray-3 bg-gray-1 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            {/* The photograph fills the frame. It used to sit `contain`ed
                inside 32px of padding with its own drop shadow, inside a
                bordered box, on a tinted panel  four nested surfaces before
                you reached the product. */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-2">
              <Image
                src={previewImage || "/images/placeholder-product.svg"}
                alt={product.title || "Product"}
                fill
                sizes="(max-width: 1024px) 90vw, 460px"
                className="object-cover"
              />

              {hasDiscount && discountPercent !== null && (
                <span className="absolute left-4 top-4 rounded-full bg-blue px-3 py-1 text-[11px] font-bold text-white shadow-1">
                  Save {discountPercent}%
                </span>
              )}

              {/* Same rule as the product card: "in stock" is the default and
                  does not need announcing  only the exceptions do. */}
              {availability.tone !== "in" && (
                <span
                  className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] shadow-1 backdrop-blur-sm ${
                    availability.tone === "low"
                      ? "bg-gray-2/95 text-dark"
                      : "bg-dark/85 text-white"
                  }`}
                >
                  {availability.label}
                </span>
              )}
            </div>

            {thumbnailImages.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-2.5">
                {thumbnailImages.map((img, key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePreview(key)}
                    aria-label={`View image ${key + 1}`}
                    aria-pressed={activePreview === key}
                    className={`relative aspect-square overflow-hidden rounded-lg border bg-gray-2 transition-colors ${
                      activePreview === key
                        ? "border-blue"
                        : "border-gray-3 hover:border-blue/50"
                    }`}
                  >
                    <Image
                      src={img || "/images/placeholder-product.svg"}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================= details ========================= */}
          <div className="flex min-w-0 flex-col p-5 sm:p-7">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="break-words text-left text-[1.35rem] font-bold capitalize leading-tight tracking-tight text-dark lg:pr-8">
                <Link
                  href={`/shop-details/${product.id}`}
                  onClick={closeModal}
                  className="transition-colors hover:text-blue"
                >
                  {product.title}
                </Link>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-[1.5rem] font-bold leading-none text-dark sm:text-[1.7rem]">
                {money(displayPrice)}
              </span>
              {hasDiscount && product.price && (
                <span className="text-[14px] font-medium text-dark-5 line-through">
                  {money(product.price)}
                </span>
              )}
              <span className="text-[12px] text-dark-5">{unitLabel}</span>
            </div>

            {/* description */}
            <div className="mt-5 border-t border-gray-3 pt-5">
              <p className="text-[13.5px] leading-relaxed text-body">
                {(() => {
                  const description =
                    product.description || "No description available";
                  const maxLength = 180;
                  if (
                    description.length <= maxLength ||
                    isDescriptionExpanded
                  ) {
                    return description;
                  }
                  return `${description.slice(0, maxLength)}…`;
                })()}
              </p>

              {product.description && product.description.length > 180 && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((v) => !v)}
                  className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue transition-opacity hover:opacity-80"
                >
                  {isDescriptionExpanded ? "Show less" : "Read more"}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      isDescriptionExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            {catalogueUrl && isAuthenticated && (
              <a
                href={catalogueUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-blue hover:underline"
              >
                <FileText className="h-4 w-4" />
                View catalogue
              </a>
            )}

            {colorOptions.length > 0 && (
              <ColorPicker
                colors={colorOptions}
                value={selectedColor}
                onChange={setSelectedColor}
                className="mt-6"
              />
            )}

            {/* quantity */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-[13px] font-semibold text-dark">
                Quantity
              </span>
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-3 bg-gray-1">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1 || !canPurchase}
                  className="grid h-11 w-11 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="grid h-11 w-12 place-items-center border-x border-gray-3 text-[14px] font-bold text-dark">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  aria-label="Increase quantity"
                  disabled={quantity >= maxQuantity || !canPurchase}
                  className="grid h-11 w-11 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!canPurchase || quantity === 0}
                onClick={handleAddToCart}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5"
              >
                {canPurchase && <ShoppingBag className="h-[18px] w-[18px]" />}
                {availability.actionLabel}
              </button>

              <button
                type="button"
                onClick={handleAddToWishlist}
                disabled={alreadyInWishlist}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-3 px-6 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:border-blue/40 disabled:text-blue"
              >
                <Heart
                  className={`h-[18px] w-[18px] ${alreadyInWishlist ? "fill-blue" : ""}`}
                />
                {alreadyInWishlist ? "Saved" : "Save"}
              </button>
            </div>

            <Link
              href={`/shop-details/${product.id}`}
              onClick={closeModal}
              className="mt-5 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-blue transition-opacity hover:opacity-80"
            >
              See full details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;
