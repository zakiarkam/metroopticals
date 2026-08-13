"use client";

import React from "react";
import ProductCard from "@/components/common/ProductCard";

/** Shop grid tile — the shared card, without the description line. */

type ProductItemData = {
  id: number;
  title: string;
  price: number;
  discountedPrice?: number | null;
  unitType?: string | null;
  reviews?: number;
  images?: string[];
  stock?: number;
  catalogueFile?: string | null;
  status?: string;
  category?: { name?: string } | null;
  brand?: { name?: string } | null;
};

const SingleGridItem = ({ item }: { item: ProductItemData }) => (
  <ProductCard
    item={{
      id: item.id,
      title: item.title,
      price: item.price,
      discountedPrice: item.discountedPrice,
      images: item.images,
      stock: item.stock,
      status: item.status,
      categoryName: item.category?.name ?? null,
      brandName: item.brand?.name ?? null,
      raw: item,
    }}
  />
);

export default SingleGridItem;
