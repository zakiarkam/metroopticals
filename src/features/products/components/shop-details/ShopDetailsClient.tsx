"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SiteContainer from "@/components/common/SiteContainer";
import { getProductById } from "@/features/products/api/product-api";
import {
  getProductCatalogueUrl,
  normalizeImageArray,
} from "@/lib/storageUtils";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { getUnitLabel, resolveDisplayPrice } from "@/lib/utils/price";
import { toast } from "react-hot-toast";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";
import { Product } from "@/features/products/types/product";

const fallbackImage = "/images/placeholder-product.jpg";

type ShopDetailsClientProps = {
  productId: number;
  initialProduct?: Product | null;
};

const formatAmount = (value?: number | null) =>
  (value ?? 0).toFixed(2).toString();

const ShopDetailsClient = ({
  productId,
  initialProduct = null,
}: ShopDetailsClientProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
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
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (productId && !hasInitialProduct) {
      void loadProduct();
    }

    return () => {
      mounted = false;
    };
  }, [productId, hasInitialProduct]);

  const images = useMemo(
    () => normalizeImageArray(product?.images) ?? [],
    [product?.images]
  );

  const featuredImage = images[selectedIndex] || images[0] || fallbackImage;

  const canViewDiscount = useDiscountVisibility();
  const { displayPrice, hasDiscount, discountPercent, originalPrice } =
    resolveDisplayPrice(
      product?.price ?? 0,
      product?.discountedPrice ?? null,
      canViewDiscount
    );
  const unitLabel = getUnitLabel(product?.unitType);

  const handleQuantityChange = useCallback((next: number) => {
    const maxStock = product?.stock || 1;
    const value = Number.isFinite(next) ? next : quantity;
    const newQty = Math.max(1, value);
    
    if (newQty > maxStock) {
      toast.error("Maximum stock reached");
      return;
    }
    
    setQuantity(newQty);
  }, [product?.stock, quantity]);

  const canPurchase = (product?.stock ?? 0) > 0 && product?.status === "ACTIVE";

  const handleAddToCart = useCallback(async () => {
    if (!product || isAdding) return;
    if (!canPurchase) return;

    setIsAdding(true);
    await addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        discountedPrice: product.discountedPrice ?? product.price,
        images: images.length ? images : [fallbackImage],
        stock: product.stock,
      },
      quantity
    );
    setIsAdding(false);
  }, [addToCart, canPurchase, images, isAdding, product, quantity]);

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
    });
    setIsSaving(false);
  }, [addToWishlist, images, isInWishlist, isSaving, product]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <section className="py-10">
        <SiteContainer>
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-2xl font-semibold text-dark mb-3">
              Product not found
            </h2>
            <p className="text-body mb-6">
              {error ?? "We couldn't find the product you were looking for."}
            </p>
            <Link
              href="/shop-with-sidebar"
              className="inline-flex items-center justify-center rounded-md bg-blue px-6 py-3 font-semibold text-white hover:bg-blue-dark"
            >
              Back to Shop
            </Link>
          </div>
        </SiteContainer>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-blue/10 blur-3xl" />
        <div className="absolute bottom-10 left-0 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
      </div>
      <SiteContainer>
        <div className="relative">
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3 text-sm">
            {/* <div className="flex items-center gap-2 text-body">
              <Link href="/" className="hover:text-blue">
                Home
              </Link>
              <span>/</span>
              <Link href="/shop-without-sidebar" className="hover:text-blue">
                Shop
              </Link>
              <span>/</span>
              <span className="text-dark font-semibold">Details</span>
            </div> */}
            <span className="rounded-full bg-blue/10 px-3 py-1 text-xs font-semibold text-blue">
              {product.status === "OUT_OF_STOCK" ? "Limited" : "Featured"}
            </span>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent" />
                <Image
                  src={featuredImage}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="relative object-contain p-8"
                />
                {hasDiscount && discountPercent !== null && (
                  <div className="absolute left-4 top-4 rounded-full bg-blue px-4 py-1 text-xs font-semibold uppercase text-white shadow-lg">
                    Save {discountPercent}%
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`relative h-20 w-20 overflow-hidden rounded-xl border transition ${
                        index === selectedIndex
                          ? "border-blue ring-2 ring-blue/30"
                          : "border-gray-200 hover:border-blue"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${product.title} thumbnail ${index + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-7">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-blue">
                  <span>{product.category?.name ?? "Product"}</span>
                  {product.subcategory?.name && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{product.subcategory.name}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-dark">
                  {product.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-semibold text-dark">
                    Rs {formatAmount(displayPrice)}
                  </span>
                  {hasDiscount && originalPrice && (
                    <span className="text-sm font-semibold uppercase text-dark-4 line-through">
                      Rs {formatAmount(originalPrice)}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-dark-4">
                    {unitLabel}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      product.status === "INACTIVE"
                        ? "bg-orange-100 text-orange-600"
                        : product.status === "OUT_OF_STOCK"
                          ? "bg-red-100 text-red-600"
                          : product.stock
                            ? "bg-green/10 text-green"
                            : "bg-red-100 text-red-600"
                    }`}
                  >
                    {product.status === "INACTIVE"
                      ? "Inactive"
                      : product.status === "OUT_OF_STOCK"
                        ? "Out of Stock"
                        : product.stock
                          ? "In stock"
                          : "Out of stock"}
                  </span>
                  {typeof product.rating === "number" && (
                    <span className="text-xs text-body">
                      Rating: {product.rating.toFixed(1)} (
                      {product.reviews ?? 0})
                    </span>
                  )}
                </div>
              </div>

              <p className="text-body leading-7">{product.description}</p>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-1 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-semibold text-dark">
                    Quantity
                  </span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-1 w-full max-w-[240px] sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="h-10 w-10 text-lg text-dark hover:bg-white"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.stock || undefined}
                      value={quantity}
                      onChange={(event) =>
                        handleQuantityChange(Number(event.target.value))
                      }
                      className="h-10 w-14 bg-transparent text-center text-sm font-semibold text-dark outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="h-10 w-10 text-lg text-dark hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || !canPurchase}
                    className="flex-1 rounded-lg bg-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAdding
                      ? "Adding..."
                      : product?.status === "INACTIVE"
                        ? "Inactive"
                        : product?.status === "OUT_OF_STOCK"
                          ? "Out of Stock"
                          : !product?.stock
                            ? "Out of Stock"
                            : "Add to cart"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToWishlist}
                    disabled={isSaving || isInWishlist(product.id)}
                    className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-dark transition hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isInWishlist(product.id) ? "In Wishlist" : "Save"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-1 space-y-2 text-sm text-body">
                {product.slug && (
                  <p>
                    <span className="font-semibold text-dark">SKU Code:</span>{" "}
                    {product.slug}
                  </p>
                )}
                {product.unitType && (
                  <p>
                    <span className="font-semibold text-dark">
                      Quantity Unit:
                    </span>{" "}
                    {product.unitType}
                  </p>
                )}
                {product.category?.name && (
                  <p>
                    <span className="font-semibold text-dark">Category:</span>{" "}
                    {product.category.name}
                  </p>
                )}
                {product.subcategory?.name && (
                  <p>
                    <span className="font-semibold text-dark">
                      Subcategory:
                    </span>{" "}
                    {product.subcategory.name}
                  </p>
                )}
                {product.catalogueFile && (
                  <p>
                    <span className="font-semibold text-dark">Catalogue:</span>{" "}
                    <a
                      className="text-blue hover:underline"
                      href={
                        getProductCatalogueUrl(product.catalogueFile) ||
                        undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
};

export default ShopDetailsClient;
