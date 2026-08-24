"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Heart,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { getProductById } from "@/features/products/api/product-api";
import {
  getProductCatalogueUrl,
  normalizeImageArray,
} from "@/lib/storageUtils";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";
import { formatPrice, getUnitLabel, resolveDisplayPrice } from "@/lib/utils/price";
import { Product } from "@/features/products/types/product";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";
import FrameMeasurements from "./FrameMeasurements";
import ProductGallery from "./ProductGallery";
import ProductSpecTable from "./ProductSpecTable";
import RelatedProducts from "./RelatedProducts";
import AdZoneClient from "@/features/advertisements/components/site/AdZoneClient";
import ProductReviews from "@/features/reviews/components/site/ProductReviews";

const fallbackImage = "/images/placeholder-product.svg";

type ShopDetailsClientProps = {
  productId: number;
  initialProduct?: Product | null;
};


/** Reassurance rows under the buy box — the questions asked at the till. */
const ASSURANCES = [
  {
    icon: Truck,
    title: "Island-wide delivery",
    copy: "Dispatched in 2 working days, tracked to your door.",
  },
  {
    icon: ShieldCheck,
    title: "12-month warranty",
    copy: "Covers manufacturing defects on frames and lenses.",
  },
  {
    icon: RotateCcw,
    title: "Free lifetime fitting",
    copy: "Adjustments and nose pads, for as long as you own them.",
  },
];

const ShopDetailsClient = ({
  productId,
  initialProduct = null,
}: ShopDetailsClientProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const canViewDiscount = useDiscountVisibility();

  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hasInitialProduct = Boolean(initialProduct);

  useEffect(() => {
    let mounted = true;
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getProductById(productId);
        if (mounted) {
          setProduct(result);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
        if (mounted) {
          setError("Failed to load product details.");
          setProduct(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (productId && !hasInitialProduct) void loadProduct();

    return () => {
      mounted = false;
    };
  }, [productId, hasInitialProduct]);

  const images = useMemo(
    () => normalizeImageArray(product?.images) ?? [],
    [product?.images]
  );
  const featuredImage = images[selectedIndex] || images[0] || fallbackImage;

  const { displayPrice, hasDiscount, discountPercent, originalPrice } =
    resolveDisplayPrice(
      product?.price ?? 0,
      product?.discountedPrice ?? null,
      canViewDiscount
    );
  const unitLabel = getUnitLabel(product?.unitType);
  const availability = getAvailability(product?.status, product?.stock);

  const hasMeasurements =
    product?.lensWidth != null ||
    product?.bridgeWidth != null ||
    product?.templeLength != null;

  /**
   * Clamp rather than refuse.
   *
   * The old handler fired a red toast on every keystroke past the limit and
   * then left the input showing the rejected number — typing "12" into a
   * 9-stock field produced two toasts and a value the buy button disagreed
   * with. It now settles on the highest quantity that can actually be bought.
   */
  const handleQuantityChange = useCallback(
    (next: number) => {
      const maxStock = Math.max(1, product?.stock ?? 1);
      const value = Number.isFinite(next) ? next : quantity;
      setQuantity(Math.min(maxStock, Math.max(1, value)));
    },
    [product?.stock, quantity]
  );

  const handleAddToCart = useCallback(async () => {
    if (!product || isAdding || !availability.canBuy) return;

    setIsAdding(true);
    await addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        discountedPrice: product.discountedPrice ?? product.price,
        images: images.length ? images : [fallbackImage],
        stock: product.stock,
      } as never,
      quantity
    );
    setIsAdding(false);
  }, [addToCart, availability.canBuy, images, isAdding, product, quantity]);

  const handleAddToWishlist = useCallback(async () => {
    if (!product || isSaving || isInWishlist(product.id)) return;

    setIsSaving(true);
    await addToWishlist({
      id: product.id,
      title: product.title,
      price: product.price,
      discountedPrice: product.discountedPrice ?? product.price,
      images: images.length ? images : [fallbackImage],
      stock: product.stock,
    } as never);
    setIsSaving(false);
  }, [addToWishlist, images, isInWishlist, isSaving, product]);

  /* ------------------------------- states ------------------------------- */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-14">
          <div className="aspect-square w-full animate-pulse rounded-3xl border border-gray-3 bg-gray-8" />
          <div className="space-y-4">
            {[
              "h-3 w-32",
              "h-9 w-3/4",
              "h-7 w-40",
              "h-24 w-full",
              "h-14 w-full",
            ].map((c) => (
              <div
                key={c}
                className={`${c} animate-pulse rounded-lg bg-gray-8`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // A network failure and a genuine 404 used to collapse into the same
  // "Product not found" panel, so a flaky connection read as a deleted product.
  if (!product || error) {
    const isMissing = !error;
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-3 bg-gray-2 p-10 text-center">
          <h2 className="text-2xl font-bold text-dark">
            {isMissing ? "Product not found" : "We couldn't load this product"}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-body">
            {isMissing
              ? "We couldn't find the product you were looking for. It may have sold out or been renamed."
              : error}
          </p>
          <Link
            href="/shop-with-sidebar"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-blue px-7 text-[13px] font-bold text-white transition-colors hover:bg-blue-dark"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const catalogueUrl = getProductCatalogueUrl(product.catalogueFile);
  const saved = isInWishlist(product.id);

  return (
    <div className="bg-gray-1 pb-4">
      {/* ------------------------- breadcrumb ------------------------- */}
      <div className="border-b border-gray-3 bg-gray-2">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8"
        >
          <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-dark-4">
            <li>
              <Link href="/" className="transition-colors hover:text-blue">
                Home
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-gray-4" />
              <Link
                href="/shop-with-sidebar"
                className="transition-colors hover:text-blue"
              >
                Shop
              </Link>
            </li>
            {product.category?.name && (
              <li className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-gray-4" />
                <Link
                  href={`/shop-with-sidebar?category=${product.category.slug ?? ""}`}
                  className="capitalize transition-colors hover:text-blue"
                >
                  {product.category.name}
                </Link>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-gray-4" />
              <span className="line-clamp-1 max-w-[220px] capitalize text-blue">
                {product.title}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-14">
          {/* ============================ gallery ============================ */}
          <div
            className="lg:sticky lg:self-start"
            // Clears the sticky header, whose height is published as a CSS
            // variable rather than guessed at.
            style={{ top: "calc(var(--site-header-height, 132px) + 1.5rem)" }}
          >
            <ProductGallery
              images={images}
              title={product.title}
              badges={
                <>
                  {hasDiscount && discountPercent !== null && (
                    <span className="absolute left-5 top-5 z-20 rounded-full bg-blue px-3.5 py-1.5 text-[12px] font-bold text-white">
                      Save {discountPercent}%
                    </span>
                  )}
                  <span
                    className={`absolute right-5 top-5 z-20 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] ${
                      AVAILABILITY_PILL_CLASSES[availability.tone]
                    }`}
                  >
                    {availability.label}
                  </span>
                </>
              }
            />
          </div>

          {/* =========================== buy panel =========================== */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
              <span>{product.category?.name ?? "Eyewear"}</span>
              {product.brand?.name && (
                <>
                  <span className="text-gray-4">·</span>
                  <span className="text-dark-4">{product.brand.name}</span>
                </>
              )}
            </div>

            <h1 className="mt-3 text-[1.75rem] font-bold capitalize leading-[1.15] tracking-tight text-dark sm:text-[2.15rem]">
              {product.title}
            </h1>

            {/* ------------------------- price ------------------------- */}
            <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="text-[2rem] font-bold leading-none text-dark">
                {formatPrice(displayPrice)}
              </span>
              {hasDiscount && originalPrice && (
                <span className="text-[16px] font-medium text-dark-5 line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className="text-[12.5px] text-dark-5">{unitLabel}</span>
            </div>

            {product.description && (
              <p className="mt-6 border-t border-gray-3 pt-6 text-[14.5px] leading-relaxed text-body">
                {product.description}
              </p>
            )}

            {/* ------------------------ buy box ------------------------ */}
            <div className="mt-7 rounded-2xl border border-gray-3 bg-gray-2 p-5 shadow-2 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[13px] font-semibold text-dark">
                  Quantity
                </span>
                <div className="flex items-center overflow-hidden rounded-xl border border-gray-3 bg-gray-1">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1 || !availability.canBuy}
                    aria-label="Decrease quantity"
                    className="grid h-11 w-11 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={product.stock || undefined}
                    value={quantity}
                    onChange={(event) =>
                      handleQuantityChange(Number(event.target.value))
                    }
                    className="h-11 w-14 border-x border-gray-3 bg-transparent text-center text-[14px] font-bold text-dark"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={!availability.canBuy}
                    aria-label="Increase quantity"
                    className="grid h-11 w-11 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* The count was only surfaced once you exceeded it. It is
                    what the quantity field is capped at, so it is stated. */}
                {availability.tone === "low" ? (
                  <span className="text-[12.5px] font-semibold text-yellow-dark">
                    {availability.label} — order soon
                  </span>
                ) : availability.canBuy && product.stock ? (
                  <span className="text-[12.5px] text-dark-4">
                    {product.stock} in stock
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdding || !availability.canBuy}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      {availability.canBuy && (
                        <ShoppingBag className="h-[18px] w-[18px]" />
                      )}
                      {availability.actionLabel}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAddToWishlist}
                  disabled={isSaving || saved}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-3 px-6 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:border-blue/40 disabled:text-blue"
                >
                  <Heart className={`h-[18px] w-[18px] ${saved ? "fill-blue" : ""}`} />
                  {saved ? "Saved" : "Save"}
                </button>
              </div>

              {catalogueUrl && (
                <a
                  href={catalogueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-blue hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Download product catalogue
                </a>
              )}
            </div>

            {/* ---------------------- assurances ---------------------- */}
            <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-gray-3 bg-gray-3 sm:grid-cols-3">
              {ASSURANCES.map(({ icon: Icon, title, copy }) => (
                <li key={title} className="bg-gray-2 p-5">
                  <Icon className="h-5 w-5 text-blue" />
                  <p className="mt-3 text-[13px] font-bold text-dark">{title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-dark-5">
                    {copy}
                  </p>
                </li>
              ))}
            </ul>

            {/* -------------------- specifications -------------------- */}
            <h2 className="mt-9 text-[15px] font-bold text-dark">
              Specifications
            </h2>
            <ProductSpecTable product={product} className="mt-3" />
          </div>
        </div>

        {/* ---------------------- frame measurements ---------------------- */}
        {hasMeasurements && (
          <section className="mt-14 rounded-3xl border border-gray-3 bg-gray-2 p-6 sm:p-9 lg:mt-20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
                  <Ruler className="h-4 w-4" />
                  Fit &amp; sizing
                </p>
                <h2 className="mt-3 text-[1.4rem] font-bold text-dark sm:text-[1.65rem]">
                  Frame measurements
                </h2>
              </div>
              <p className="max-w-md text-[13.5px] leading-relaxed text-body">
                Check these against a pair you already wear — the numbers are
                printed on the inside of the temple arm.
              </p>
            </div>

            <FrameMeasurements
              className="mt-8"
              lensWidth={product.lensWidth}
              bridgeWidth={product.bridgeWidth}
              templeLength={product.templeLength}
            />
          </section>
        )}

        {/* ------------------------- reviews ------------------------- */}
        <ProductReviews productId={product.id} className="mt-14 lg:mt-20" />

        {/* --------------------- advertisement --------------------- */}
        <AdZoneClient placement="product-detail" className="mt-14 lg:mt-20" />

        {/* ------------------------- related ------------------------- */}
        <RelatedProducts
          currentId={product.id}
          categorySlug={product.category?.slug ?? undefined}
        />
      </div>
    </div>
  );
};

export default ShopDetailsClient;
