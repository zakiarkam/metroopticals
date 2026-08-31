"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Product } from "@/features/products/types/product";
import { getProductById } from "@/features/products/api/product-api";
import { getUnitLabel } from "@/lib/utils/price";
import {
  buildSpecRows,
  hasEyewearSpec,
} from "@/features/products/utils/eyewear";
import { getProductImageUrl, getProductCatalogueUrl } from "@/lib/storageUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, X } from "lucide-react";
import { Toast } from "@/lib/utils/toast";

interface ProductDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number | null;
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  onClose,
  productId,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      const data = await getProductById(productId);
      setProduct(data);
      setSelectedImage(0);
    } catch (err: any) {
      console.error("Failed to load product:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load product details";

      Toast.error(errorMessage);
      onCloseRef.current();
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen && productId) {
      loadProduct();
    }
  }, [isOpen, productId, loadProduct]);

  const formatPrice = (price: number) =>
    `Rs ${new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getImageUrl = (fileName: string) => getProductImageUrl(fileName) ?? "";

  const getCatalogueUrl = (fileName: string) =>
    getProductCatalogueUrl(fileName) ?? "";

  const handleDownloadCatalogue = () => {
    if (!product?.catalogueFile) return;

    try {
      window.open(getCatalogueUrl(product.catalogueFile), "_blank");
      Toast.success("Opening catalogue...");
    } catch {
      Toast.error("Failed to open catalogue");
    }
  };

  const statusColors: Record<string, string> = useMemo(
    () => ({
      ACTIVE: "bg-green-light-6 text-green",
      INACTIVE: "bg-red-light-6 text-red",
      OUT_OF_STOCK: "bg-yellow-light-4 text-yellow-dark",
      DRAFT: "bg-gray-2 text-dark-3",
      SCHEDULED: "bg-blue-light-5 text-blue",
    }),
    [],
  );

  const discountPct =
    product?.discountedPrice && product?.price
      ? Math.round(
          ((product.price - product.discountedPrice) / product.price) * 100,
        )
      : 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent hideClose className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:p-0">
        {/* Header (compact, sticky) */}
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3">
          <div className="flex items-start md:items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-3">
            <div className="min-w-0">
              <DialogTitle className="text-base md:text-lg font-semibold leading-tight">
                Product Details
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm text-body">
                Complete product information and specifications
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-lg"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 px-3 md:px-4">
              <div className="text-center">
                <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent" />
                <p className="mt-3 text-xs md:text-sm text-body">
                  Loading product details...
                </p>
              </div>
            </div>
          ) : product ? (
            <div className="px-3 py-2 md:px-4 md:py-3 space-y-4">
              {/* Top: Gallery + Main Info */}
              <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
                {/* Gallery Card */}
                <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm p-3 md:p-4 space-y-3">
                  {/* Main image */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-3 bg-gray-1">
                    {product.images?.length ? (
                      <Image
                        src={getImageUrl(product.images[selectedImage])}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 384px"
                        className="object-contain transition-transform duration-300 hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full px-6">
                        <div className="text-center text-body">
                          <svg
                            className="mx-auto h-14 w-14 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="mt-3 text-xs md:text-sm font-medium text-dark">
                            No images available
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbnails: horizontal scroll on mobile */}
                  {product.images?.length > 1 && (
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 min-w-max pr-1">
                        {product.images.map((img, idx) => {
                          const active = selectedImage === idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedImage(idx)}
                              className={[
                                "relative h-14 w-14 md:h-16 md:w-16 overflow-hidden rounded-lg border transition-all",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2",
                                active
                                  ? "border-blue shadow-sm"
                                  : "border-gray-3 hover:border-gray-4",
                              ].join(" ")}
                              aria-label={`Select image ${idx + 1}`}
                            >
                              <Image
                                src={getImageUrl(img)}
                                alt={`${product.title} ${idx + 1}`}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Catalogue CTA */}
                  {product.catalogueFile && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadCatalogue}
                      className="h-8 w-full justify-center gap-2 rounded-lg border-dashed"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        View Product Catalogue
                      </span>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </section>

                {/* Info Card */}
                <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm p-3 md:p-4">
                  <div className="space-y-3">
                    {/* Title row */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-semibold text-dark leading-snug line-clamp-2">
                          {product.title}
                        </h2>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-body">
                          <span
                            className={[
                              "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              statusColors[product.status] ||
                                "bg-gray-2 text-dark-3",
                            ].join(" ")}
                          >
                            {product.status}
                          </span>
                          <span className="truncate">
                            SKU Code: {product.slug}
                          </span>
                          <span className="truncate">
                            Quantity Unit: {product.unitType || "PIECES"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {product.discountedPrice ? (
                            <>
                              <span className="text-2xl md:text-3xl font-bold text-blue leading-none">
                                {formatPrice(product.discountedPrice)}
                              </span>
                              <span className="text-sm md:text-base text-body line-through">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-sm text-body">
                                {getUnitLabel(product.unitType)}
                              </span>
                              {!!discountPct && (
                                <span className="rounded-full bg-red-light-6 px-2.5 py-1 text-[11px] font-bold text-red">
                                  Save {discountPct}%
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-2xl md:text-3xl font-bold text-dark leading-none">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-sm text-body">
                                {getUnitLabel(product.unitType)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Key facts (compact) */}
                    <div className="rounded-lg border border-gray-3 bg-gray-2">
                      <div className="px-3 py-2 flex items-center justify-between gap-3">
                        <span className="text-xs md:text-sm text-body font-medium">
                          Stock Available
                        </span>
                        <span className="text-xs md:text-sm font-semibold text-dark">
                          {product.stock} units
                        </span>
                      </div>
                      {/* How the total splits across the colourways, with
                          sold-out colours called out for the admin. */}
                      {(product.colorStocks?.length ?? 0) > 0 && (
                        <>
                          <div className="h-px bg-gray-2" />
                          <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs md:text-sm text-body font-medium">
                              By colour
                            </span>
                            <span className="flex flex-wrap justify-end gap-1.5">
                              {product.colorStocks!.map((row) => (
                                <span
                                  key={row.color}
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                    row.stock != null && row.stock <= 0
                                      ? "border-red/30 bg-red/10 text-red"
                                      : "border-gray-3 bg-gray-1 text-dark"
                                  }`}
                                >
                                  {row.color}:{" "}
                                  {row.stock == null
                                    ? "not counted"
                                    : row.stock <= 0
                                      ? "out"
                                      : row.stock}
                                </span>
                              ))}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="h-px bg-gray-2" />
                      <div className="px-3 py-2 flex items-center justify-between gap-3">
                        <span className="text-xs md:text-sm text-body font-medium">
                          Category
                        </span>
                        <span className="text-xs md:text-sm font-semibold text-dark truncate max-w-[60%] text-right">
                          {product.category?.name || "Uncategorized"}
                        </span>
                      </div>
                      {product.brand && (
                        <>
                          <div className="h-px bg-gray-2" />
                          <div className="px-3 py-2 flex items-center justify-between gap-3">
                            <span className="text-xs md:text-sm text-body font-medium">
                              Brand
                            </span>
                            <span className="text-xs md:text-sm font-semibold text-dark truncate max-w-[60%] text-right">
                              {product.brand.name}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Description */}
              <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm p-3 md:p-4">
                <h3 className="text-sm md:text-base font-semibold text-dark">
                  Description
                </h3>
                <p className="mt-2 text-xs md:text-sm text-dark leading-relaxed whitespace-pre-wrap">
                  {product.description || "No description available."}
                </p>
              </section>

              {/* Eyewear specification  frames only */}
              {hasEyewearSpec(product) && (
                <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm p-3 md:p-4">
                  <h3 className="text-sm md:text-base font-semibold text-dark">
                    Eyewear Specification
                  </h3>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {buildSpecRows(product).map((row) => (
                      <div
                        key={row.label}
                        className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2"
                      >
                        <p className="text-[11px] text-body uppercase tracking-wider font-semibold">
                          {row.label}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-dark">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Category details (responsive, compact cards) */}
              {product.category && (
                <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm p-3 md:p-4">
                  <h3 className="text-sm md:text-base font-semibold text-dark">
                    Category Information
                  </h3>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2">
                      <p className="text-[11px] text-body uppercase tracking-wider font-semibold">
                        Main Category
                      </p>
                      <p className="mt-1 text-sm md:text-base font-semibold text-dark">
                        {product.category.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] md:text-xs text-body overflow-x-auto whitespace-nowrap">
                        {product.category.slug}
                      </p>
                      {product.category.description && (
                        <p className="mt-2 text-xs md:text-sm text-dark leading-relaxed">
                          {product.category.description}
                        </p>
                      )}
                    </div>

                    {product.brand && (
                      <div className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2">
                        <p className="text-[11px] text-body uppercase tracking-wider font-semibold">
                          Brand
                        </p>
                        <p className="mt-1 text-sm md:text-base font-semibold text-dark">
                          {product.brand.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] md:text-xs text-body overflow-x-auto whitespace-nowrap">
                          {product.brand.slug}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm p-3 md:p-4">
                <h3 className="text-sm md:text-base font-semibold text-dark">
                  Timeline
                </h3>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2">
                    <p className="text-[11px] text-body uppercase tracking-wider font-semibold flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-green"
                        aria-hidden="true"
                      />
                      Created
                    </p>
                    <p className="mt-1 text-xs md:text-sm font-semibold text-dark">
                      {formatDate(product.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2">
                    <p className="text-[11px] text-body uppercase tracking-wider font-semibold flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-blue"
                        aria-hidden="true"
                      />
                      Last Updated
                    </p>
                    <p className="mt-1 text-xs md:text-sm font-semibold text-dark">
                      {formatDate(product.updatedAt)}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
