"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { updateAdvertisement } from "@/features/advertisements/api/advertisement-api";
import { getProducts } from "@/features/products/api/product-api";
import { Toast } from "@/lib/utils/toast";
import { getProductImageUrl } from "@/lib/storageUtils";
import { placementSlotOptions } from "@/features/advertisements/constants/advertisement";
import { Advertisement, AdvertisementPlacement } from "@/features/advertisements/types/advertisement";
import { Product } from "@/features/products/types/product";
import { getProductDetailsUrl } from "@/features/advertisements/services/advertisement-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialFormData = {
  title: "",
  imageUrl: "",
  link: "",
  placement: "hero" as AdvertisementPlacement,
  status: "active" as "active" | "inactive",
  priority: 0,
  slot: 1,
  startDate: "",
  endDate: "",
  productId: null as number | null,
};

type FormState = typeof initialFormData;

interface EditAdvertisementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  advertisement: Advertisement | null;
}

const EditAdvertisementDialog: React.FC<EditAdvertisementDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  advertisement,
}) => {
  const [formData, setFormData] = useState<FormState>({
    ...initialFormData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productError, setProductError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [autoLink, setAutoLink] = useState(false);

  useEffect(() => {
    if (!advertisement || !isOpen) return;

    setFormData({
      title: advertisement.title,
      imageUrl: advertisement.imageUrl,
      link: advertisement.link || "",
      placement: advertisement.placement,
      status: advertisement.status,
      priority: advertisement.priority,
      slot: advertisement.slot || 1,
      startDate: advertisement.startDate
        ? new Date(advertisement.startDate).toISOString().split("T")[0]
        : "",
      endDate: advertisement.endDate
        ? new Date(advertisement.endDate).toISOString().split("T")[0]
        : "",
      productId: advertisement.productId ?? null,
    });

    setSelectedProduct(advertisement.product ?? null);
  }, [advertisement, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setProductsLoading(true);
    const featuredProduct = advertisement?.product ?? null;
    const timer = setTimeout(() => {
      const trimmedSearch = productSearch.trim();
      getProducts({
        limit: 50,
        status: "ACTIVE",
        ...(trimmedSearch ? { search: trimmedSearch } : {}),
      })
        .then((data) => {
          if (!isMounted) return;
          const fetched = [...data.products];
          if (
            featuredProduct &&
            !fetched.some((item) => item.id === featuredProduct.id)
          ) {
            fetched.unshift(featuredProduct);
          }
          setProducts(fetched);
          setProductError(null);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("Failed to load products:", error);
          setProductError(
            "Unable to load products right now. Try again or adjust the search."
          );
        })
        .finally(() => {
          if (isMounted) setProductsLoading(false);
        });
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [productSearch, isOpen, advertisement?.product]);

  useEffect(() => {
    if (!isOpen) {
      setProductSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!autoLink || !formData.productId) return;
    setFormData((prev) => ({
      ...prev,
      link: getProductDetailsUrl(prev.productId),
    }));
  }, [autoLink, formData.productId]);

  const availableSlots =
    placementSlotOptions[formData.placement] || placementSlotOptions.hero;

  const handlePlacementChange = (placement: AdvertisementPlacement) => {
    const slots = placementSlotOptions[placement] || [1];
    setFormData((prev) => ({
      ...prev,
      placement,
      slot: slots.includes(prev.slot) ? prev.slot : slots[0],
    }));
  };

  const handleProductSelect = (productIdValue: string) => {
    if (!productIdValue) {
      setSelectedProduct(null);
      setFormData((prev) => ({
        ...prev,
        productId: null,
      }));
      return;
    }

    const productId = Number(productIdValue);
    if (Number.isNaN(productId)) {
      return;
    }

    const product = products.find((item) => item.id === productId) ?? null;
    if (!product) return;

    const primaryImage =
      getProductImageUrl(product.images?.[0]) ||
      "/images/placeholder-product.jpg";

    setSelectedProduct(product);
    setFormData((prev) => ({
      ...prev,
      productId,
      title: product.title,
      imageUrl: primaryImage,
      link: autoLink ? getProductDetailsUrl(productId) : prev.link,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!advertisement) return;

    if (!formData.productId) {
      Toast.error("Please select a product for this advertisement.");
      return;
    }

    if (!formData.title.trim() || !formData.imageUrl.trim()) {
      Toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading("Updating advertisement...");

    try {
      await updateAdvertisement(advertisement.id, {
        title: formData.title,
        imageUrl: formData.imageUrl,
        link: formData.link || undefined,
        placement: formData.placement,
        slot: formData.slot,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : undefined,
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : undefined,
        productId: formData.productId,
      });

      Toast.update(toastId, {
        render: "Advertisement updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to update advertisement:", error);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update advertisement. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  if (!isOpen || !advertisement) return null;

  const selectedImage =
    selectedProduct && getProductImageUrl(selectedProduct.images?.[0]);

  const selectedPrice =
    selectedProduct?.discountedPrice &&
    selectedProduct.discountedPrice < selectedProduct.price
      ? selectedProduct.discountedPrice
      : selectedProduct?.price;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-full max-w-2xl rounded-xl bg-gray-2 p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-gray-3">
        <DialogHeader className="mb-6 px-0">
          <DialogTitle className="text-xl font-semibold text-dark">
            Edit Advertisement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-custom-sm font-medium text-dark mb-2">
              Product <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search for a product..."
              className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
            <div className="flex items-center justify-between text-custom-xs text-body mt-1">
              <span>
                {productsLoading
                  ? "Searching products..."
                  : productError
                  ? productError
                  : `${products.length} products available`}
              </span>
            </div>

            <select
              value={
                formData.productId !== null ? String(formData.productId) : ""
              }
              onChange={(e) => handleProductSelect(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            >
              <option value="">Select a product</option>
              {!productsLoading &&
                products.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    {product.title}
                  </option>
                ))}
              {!productsLoading && products.length === 0 && (
                <option value="" disabled>
                  No products found
                </option>
              )}
            </select>
          </div>

          <div className="rounded-lg border border-gray-3 bg-gray-1 p-4">
            {selectedProduct ? (
              <div className="flex gap-4">
                <div className="h-28 w-28">
                  <Image
                    src={selectedImage ?? "/images/placeholder-product.jpg"}
                    alt={selectedProduct.title}
                    width={112}
                    height={112}
                    className="rounded-lg object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-dark">
                    {selectedProduct.title}
                  </p>
                  <p className="text-custom-xs text-body mb-2 line-clamp-2">
                    {selectedProduct.description || "No description available."}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-dark">
                      Rs {(selectedPrice ?? 0).toLocaleString()}
                    </span>
                    {selectedProduct.discountedPrice &&
                      selectedProduct.discountedPrice <
                        selectedProduct.price && (
                        <span className="text-sm text-dark-4 line-through">
                          Rs {selectedProduct.price.toLocaleString()}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-custom-sm text-body">
                Select a product to preview the advertisement details.
              </p>
            )}
          </div>

          <div>
            <label className="block text-custom-sm font-medium text-dark mb-2">
              Title <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              placeholder="Enter advertisement title"
              required
            />
          </div>

          <div>
            <label className="block text-custom-sm font-medium text-dark mb-2">
              Image URL <span className="text-red">*</span>
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              placeholder="https://example.com/image.jpg"
              required
            />
          </div>

          <div>
            <label className="block text-custom-sm font-medium text-dark mb-2">
              Link URL
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) =>
                setFormData({ ...formData, link: e.target.value })
              }
              className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              placeholder="https://example.com"
            />
            <div className="mt-2 flex items-center gap-2 text-custom-xs text-body">
              <input
                id="edit-auto-link"
                type="checkbox"
                checked={autoLink}
                onChange={(e) => setAutoLink(e.target.checked)}
                className="h-4 w-4 rounded border border-gray-4 text-blue focus:ring-blue"
              />
              <label htmlFor="edit-auto-link">
                Auto fill the product page URL when a product is selected
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-custom-sm font-medium text-dark mb-2">
                Placement
              </label>
              <select
                value={formData.placement}
                onChange={(e) =>
                  handlePlacementChange(
                    e.target.value as AdvertisementPlacement
                  )
                }
                className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              >
                <option value="hero">Hero</option>
                <option value="promobanner">Promo Banner</option>
                <option value="countdown">Countdown</option>
              </select>
            </div>

            <div>
              <label className="block text-custom-sm font-medium text-dark mb-2">
                Slot
              </label>
              <select
                value={formData.slot}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slot: parseInt(e.target.value, 10),
                  })
                }
                className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              >
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    Slot {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-custom-sm font-medium text-dark mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "active" | "inactive",
                  })
                }
                className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-custom-sm font-medium text-dark mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                min="0"
              />
              <p className="mt-1 text-custom-xs text-body">
                Higher priority ads override lower ones when slots collide.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-custom-sm font-medium text-dark mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </div>
            <div>
              <label className="block text-custom-sm font-medium text-dark mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-3 px-4 py-2 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-3 px-4 py-2 text-custom-sm font-medium text-dark hover:bg-gray-1 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue px-4 py-2 text-custom-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Advertisement"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAdvertisementDialog;
