"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { Check, Link2, Search } from "lucide-react";
import AdImageUpload from "./AdImageUpload";
import { getProducts } from "@/features/products/api/product-api";
import { getProductImageUrl } from "@/lib/storageUtils";
import type { Product } from "@/features/products/types/product";
import type {
  Advertisement,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";
import {
  AD_PLACEMENTS,
  AD_PLACEMENT_GROUPS,
  AD_PLACEMENT_IDS,
  type AdPlacementMeta,
} from "@/features/advertisements/constants/advertisement";

/**
 * The one advertisement form.
 *
 * Add and edit differ only in their initial values and their submit handler,
 * so both dialogs render this and there is a single place where the placement
 * rules, the artwork rules and the scheduling rules live.
 */

export type AdFormValues = {
  title: string;
  imageUrl: string;
  link: string;
  placement: AdvertisementPlacement;
  status: "active" | "inactive";
  priority: number;
  slot: number;
  startDate: string;
  endDate: string;
  productId: number | null;
};

export const emptyAdFormValues: AdFormValues = {
  title: "",
  imageUrl: "",
  link: "",
  placement: "home-billboard",
  status: "active",
  priority: 0,
  slot: 1,
  startDate: "",
  endDate: "",
  productId: null,
};

/**
 * Blank values for a new ad, optionally pinned to the zone the admin clicked
 * "add" from. Slot follows the placement so the form never opens on a slot the
 * zone does not render.
 */
export const advertisementFormDefaults = (
  placement?: AdvertisementPlacement
): AdFormValues => {
  const target = placement ?? emptyAdFormValues.placement;
  return {
    ...emptyAdFormValues,
    placement: target,
    slot: AD_PLACEMENTS[target].slots[0],
  };
};

/** ISO timestamp → the `YYYY-MM-DDTHH:mm` a datetime-local input expects. */
const toLocalInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const advertisementToFormValues = (ad: Advertisement): AdFormValues => ({
  title: ad.title || "",
  imageUrl: ad.imageUrl || "",
  link: ad.link || "",
  placement: ad.placement,
  status: ad.status,
  priority: ad.priority ?? 0,
  slot: ad.slot ?? 1,
  startDate: toLocalInput(ad.startDate),
  endDate: toLocalInput(ad.endDate),
  productId: ad.productId ?? ad.product?.id ?? null,
});

/** Home product slots are addressed by priority — name them, don't number them. */
const HOME_POSITIONS = [
  { value: 0, label: "After categories" },
  { value: 1, label: "After new arrivals" },
  { value: 2, label: "After best sellers" },
];

const fieldClass =
  "w-full rounded-xl border border-gray-3 bg-gray-2 px-4 py-2.5 text-[14px] text-dark outline-none transition-colors placeholder:text-dark-5 focus:border-blue focus:ring-1 focus:ring-blue";

const labelClass = "mb-2 block text-[13px] font-semibold text-dark";

const Section = ({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-3 bg-gray-1 p-5">
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue text-[12px] font-bold text-white">
        {step}
      </span>
      <div>
        <h4 className="text-[15px] font-semibold leading-tight text-dark">
          {title}
        </h4>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-dark-4">
          {description}
        </p>
      </div>
    </div>
    {children}
  </section>
);

interface AdvertisementFormProps {
  values: AdFormValues;
  onChange: (next: AdFormValues) => void;
  /** Locked on edit — moving an ad between zones changes what it needs. */
  disablePlacement?: boolean;
}

const AdvertisementForm: React.FC<AdvertisementFormProps> = ({
  values,
  onChange,
  disablePlacement = false,
}) => {
  const meta: AdPlacementMeta = AD_PLACEMENTS[values.placement];
  const isProductAd = meta.kind === "product";

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const set = (patch: Partial<AdFormValues>) =>
    onChange({ ...values, ...patch });

  // Products are only needed by the product-driven placements.
  useEffect(() => {
    if (!isProductAd) return;

    let active = true;
    setProductsLoading(true);

    const timer = setTimeout(() => {
      const search = productSearch.trim();
      getProducts({
        limit: 50,
        status: "ACTIVE",
        ...(search ? { search } : {}),
      })
        .then((data) => {
          if (!active) return;
          setProducts(data.products);
          setProductError(null);
        })
        .catch(() => {
          if (!active) return;
          setProductError("Could not load products. Try again in a moment.");
        })
        .finally(() => {
          if (active) setProductsLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isProductAd, productSearch]);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === values.productId) ?? null,
    [products, values.productId]
  );

  const handlePlacementChange = (placement: AdvertisementPlacement) => {
    const next = AD_PLACEMENTS[placement];
    onChange({
      ...values,
      placement,
      slot: next.slots.includes(values.slot) ? values.slot : next.slots[0],
      // Banner zones ignore priority ordering beyond tie-breaks; product zones
      // read it as the home position, so clamp it into range on the way in.
      priority:
        next.kind === "product" ? Math.min(values.priority, 2) : values.priority,
      // A product carried into a banner zone would silently turn the artwork
      // into a product link, so drop it.
      productId: next.kind === "product" ? values.productId : null,
    });
  };

  const handleProductSelect = (raw: string) => {
    if (!raw) {
      set({ productId: null });
      return;
    }

    const id = Number(raw);
    const product = products.find((item) => item.id === id);
    if (!product) return;

    set({
      productId: id,
      title: values.title.trim() ? values.title : product.title,
      imageUrl:
        values.imageUrl ||
        getProductImageUrl(product.images?.[0]) ||
        values.imageUrl,
      link: values.link || `/shop-details/${id}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------ placement ------------------------------ */}
      <Section
        step={1}
        title="Where does it appear?"
        description={
          disablePlacement
            ? "Placement is fixed once an ad is created — delete and re-add to move it."
            : "Pick the zone on the site this creative fills."
        }
      >
        <div className="space-y-4">
          {AD_PLACEMENT_GROUPS.map((group) => {
            const ids = AD_PLACEMENT_IDS.filter(
              (id) => AD_PLACEMENTS[id].group === group
            );
            if (!ids.length) return null;

            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-dark-5">
                  {group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ids.map((id) => {
                    const option = AD_PLACEMENTS[id];
                    const selected = values.placement === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={disablePlacement && !selected}
                        onClick={() => handlePlacementChange(id)}
                        className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          selected
                            ? "border-blue bg-blue-light-5"
                            : "border-gray-3 bg-gray-2 hover:border-blue/50"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[13.5px] font-semibold leading-tight text-dark">
                            {option.label}
                          </span>
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-blue" />
                          )}
                        </span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-dark-4">
                          {option.description}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-dark-4">
                          {option.kind === "banner"
                            ? "Photo banner"
                            : "Product driven"}
                          <span className="text-dark-5">
                            · {option.recommended}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ------------------------------- artwork ------------------------------- */}
      <Section
        step={2}
        title="Artwork"
        description={
          isProductAd
            ? "Optional — leave empty and the linked product's photo is used."
            : "The photo visitors will see. This is the whole ad."
        }
      >
        <AdImageUpload
          value={values.imageUrl || null}
          placement={meta}
          title={values.title}
          onChange={(next) => set({ imageUrl: next ?? "" })}
          helperText={
            isProductAd
              ? `Rendered at ${meta.recommended}. Leave this empty to inherit the product photo.`
              : undefined
          }
        />
      </Section>

      {/* -------------------------------- product ------------------------------- */}
      {isProductAd && (
        <Section
          step={3}
          title="Linked product"
          description="This zone pulls its title, price and fallback image from the catalogue."
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products…"
              className={`${fieldClass} pl-10`}
            />
          </div>

          <select
            value={values.productId !== null ? String(values.productId) : ""}
            onChange={(e) => handleProductSelect(e.target.value)}
            className={`${fieldClass} mt-2`}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={String(product.id)}>
                {product.title}
              </option>
            ))}
          </select>

          <p className="mt-1.5 text-[12px] text-dark-4">
            {productsLoading
              ? "Searching…"
              : productError
                ? productError
                : `${products.length} active products`}
          </p>

          {selectedProduct && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-3 bg-gray-2 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-1">
                <Image
                  src={
                    getProductImageUrl(selectedProduct.images?.[0]) ||
                    "/images/placeholder-product.svg"
                  }
                  alt={selectedProduct.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-dark">
                  {selectedProduct.title}
                </p>
                <p className="text-[12.5px] text-dark-4">
                  Rs{" "}
                  {(
                    selectedProduct.discountedPrice ?? selectedProduct.price
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* -------------------------------- details ------------------------------- */}
      <Section
        step={isProductAd ? 4 : 3}
        title="Details"
        description="The internal name, and where a click should land."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Title <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Sunglass season — 30% off"
              className={fieldClass}
              maxLength={200}
            />
            <p className="mt-1.5 text-[12px] text-dark-4">
              Used as the image&apos;s alt text, so describe what is in the
              picture.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Click-through link</label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5" />
              <input
                type="text"
                value={values.link}
                onChange={(e) => set({ link: e.target.value })}
                placeholder="/shop-with-sidebar"
                className={`${fieldClass} pl-10`}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-dark-4">
              A path such as <code>/shop-with-sidebar</code>, or a full
              https:// URL. Leave empty and the banner is not clickable.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------------------- position & schedule ---------------------- */}
      <Section
        step={isProductAd ? 5 : 4}
        title="Position &amp; schedule"
        description="Where it sits within the zone, and when it runs."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {meta.slots.length > 1 && (
            <div>
              <label className={labelClass}>Slot</label>
              <select
                value={values.slot}
                onChange={(e) => set({ slot: Number(e.target.value) })}
                className={fieldClass}
              >
                {meta.slots.map((slot) => (
                  <option key={slot} value={slot}>
                    Slot {slot}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[12px] text-dark-4">
                Slot 1 is the leftmost / topmost position in this zone.
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>
              {isProductAd ? "Home position" : "Priority"}
            </label>
            {isProductAd ? (
              <select
                value={values.priority}
                onChange={(e) => set({ priority: Number(e.target.value) })}
                className={fieldClass}
              >
                {HOME_POSITIONS.map((position) => (
                  <option key={position.value} value={position.value}>
                    {position.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  value={values.priority}
                  onChange={(e) =>
                    set({ priority: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className={fieldClass}
                />
                <p className="mt-1.5 text-[12px] text-dark-4">
                  Only breaks ties when two ads claim the same slot — higher
                  wins.
                </p>
              </>
            )}
          </div>

          <div>
            <label className={labelClass}>Starts</label>
            <input
              type="datetime-local"
              value={values.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Ends</label>
            <input
              type="datetime-local"
              value={values.endDate}
              onChange={(e) => set({ endDate: e.target.value })}
              className={fieldClass}
            />
            <p className="mt-1.5 text-[12px] text-dark-4">
              Leave both empty to run indefinitely.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Status</label>
            <div className="flex gap-2">
              {(["active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => set({ status })}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold capitalize transition-colors ${
                    values.status === status
                      ? "border-blue bg-blue text-white"
                      : "border-gray-3 bg-gray-2 text-dark hover:border-blue/50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AdvertisementForm;

/**
 * Turn form values into an API payload, or explain what is missing.
 *
 * Mirrors the zod schema on the server so the admin gets a plain sentence at
 * the point of failure rather than a validation blob after a round trip.
 */
export const buildAdvertisementPayload = (values: AdFormValues) => {
  const meta = AD_PLACEMENTS[values.placement];
  const title = values.title.trim();
  const imageUrl = values.imageUrl.trim();
  const link = values.link.trim();

  if (!title) {
    return { ok: false as const, message: "Give the advertisement a title." };
  }

  if (!imageUrl) {
    return {
      ok: false as const,
      message: meta.kind === "product"
        ? "Upload artwork, or pick a product so its photo can be used."
        : "Upload the banner artwork.",
    };
  }

  if (meta.kind === "product" && !values.productId) {
    return {
      ok: false as const,
      message: `${meta.label} needs a linked product.`,
    };
  }

  if (link && !/^https?:\/\//i.test(link) && !link.startsWith("/")) {
    return {
      ok: false as const,
      message: "The link must start with / or with http(s)://",
    };
  }

  if (values.startDate && values.endDate) {
    if (new Date(values.endDate) < new Date(values.startDate)) {
      return {
        ok: false as const,
        message: "The end date falls before the start date.",
      };
    }
  }

  return {
    ok: true as const,
    payload: {
      title,
      imageUrl,
      link: link || undefined,
      placement: values.placement,
      status: values.status,
      priority: values.priority,
      slot: meta.slots.includes(values.slot) ? values.slot : meta.slots[0],
      startDate: values.startDate
        ? new Date(values.startDate).toISOString()
        : undefined,
      endDate: values.endDate
        ? new Date(values.endDate).toISOString()
        : undefined,
      productId: meta.kind === "product" ? values.productId : null,
    },
  };
};
