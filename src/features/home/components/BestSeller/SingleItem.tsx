"use client";

import React from "react";
import ProductCard from "@/components/common/ProductCard";
import type { TopProduct } from "@/features/dashboard/types/dashboard";

/**
 * Best-seller records come from the dashboard aggregate (`name` instead of
 * `title`, category as a plain string), so this only normalises the shape —
 * the card itself is shared with the rest of the storefront.
 */

type ProductData = TopProduct & {
  title?: string;
  description?: string;
  unitType?: string | null;
  imgs?: { thumbnails: string[]; previews: string[] };
};

const SingleItem = React.memo(({ item }: { item: ProductData }) => {
  const images =
    (item.images?.length ? item.images : undefined) ??
    (item.imgs?.previews?.length ? item.imgs.previews : undefined) ??
    item.imgs?.thumbnails ??
    [];

  return (
    <ProductCard
      showDescription
      item={{
        id: item.id,
        title: item.title ?? item.name ?? "Product",
        price: item.price,
        discountedPrice: item.discountedPrice,
        images,
        stock: item.stock,
        status: item.status,
        description: item.description,
        categoryName: item.category ?? null,
        raw: item,
      }}
    />
  );
});

SingleItem.displayName = "BestSellerSingleItem";

export default SingleItem;
