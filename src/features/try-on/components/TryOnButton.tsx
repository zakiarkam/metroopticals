"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Camera } from "lucide-react";
import { TRYON_ENABLED } from "@/features/try-on/config";
import { getTryOnAssets } from "@/features/try-on/api/tryon-api";
import { toFrameAssets } from "@/features/try-on/utils/assets";
import type { Product } from "@/features/products/types/product";
import type { TryOnFrameAsset } from "@/features/try-on/types";

// The dialog pulls in the engine; neither is wanted until the button is used.
const TryOnModal = dynamic(() => import("./TryOnModal"), { ssr: false });

type Props = {
  product: Product;
  /** The colour picked on the product page, so the try-on opens on it. */
  colour?: string;
  className?: string;
  /** Lets the customer buy from inside the try-on. Omit when out of stock. */
  onAddToCart?: () => void | Promise<void>;
  priceLabel?: string;
};

/**
 * Rendered only when the product has at least one active try-on asset  a
 * product with none shows nothing, which is how the rollout is staged.
 */
export default function TryOnButton({
  product,
  colour,
  className = "",
  onAddToCart,
  priceLabel,
}: Props) {
  const [assets, setAssets] = useState<TryOnFrameAsset[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!TRYON_ENABLED) return;
    const controller = new AbortController();
    getTryOnAssets(product.id, { signal: controller.signal })
      .then((rows) => setAssets(toFrameAssets(rows)))
      .catch(() => setAssets(null));
    return () => controller.abort();
  }, [product.id]);

  const frameSpec = useMemo(
    () => ({
      lensWidth: product.lensWidth,
      bridgeWidth: product.bridgeWidth,
      templeLength: product.templeLength,
      rimType: product.rimType,
      weightGrams: product.weightGrams,
    }),
    [product.bridgeWidth, product.lensWidth, product.rimType, product.templeLength, product.weightGrams],
  );

  if (!TRYON_ENABLED || !assets?.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue bg-blue-light-5 text-[14px] font-bold text-blue transition-colors hover:bg-blue-light-4 ${className}`}
      >
        <Camera className="h-[18px] w-[18px]" />
        Try on with your camera
      </button>

      {open && (
        <TryOnModal
          open={open}
          onClose={() => setOpen(false)}
          productId={product.id}
          title={product.title}
          frameSpec={frameSpec}
          frameShape={product.frameShape}
          assets={assets}
          initialColour={colour}
          onAddToCart={onAddToCart}
          priceLabel={priceLabel}
          similarHref={
            product.frameShape
              ? `/shop-with-sidebar?shapes=${product.frameShape}`
              : "/shop-with-sidebar"
          }
        />
      )}
    </>
  );
}
