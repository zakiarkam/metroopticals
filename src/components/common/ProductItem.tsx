"use client";

import React from "react";
import ProductCard from "./ProductCard";

/**
 * Adapter kept for the home carousels, which pass the raw API product shape
 * (images may arrive as `images`, `imgs.previews` or `imgs.thumbnails`).
 * All visual decisions live in <ProductCard />.
 */

type ProductItemData = {
  id: number;
  title: string;
  price: number;
  discountedPrice?: number | null;
  unitType?: string | null;
  reviews?: number;
  images?: string[];
  stock?: number;
  imgs?: {
    previews?: string[];
    thumbnails?: string[];
  };
  catalogueFile?: string | null;
  frameColors?: string[] | null;
  description?: string;
  category?: { name?: string } | null;
  brand?: { name?: string } | null;
  status?: string;
};

const pickImages = (item: ProductItemData) => {
  const candidates = [
    Array.isArray(item.images) ? item.images : undefined,
    item.imgs?.previews,
    item.imgs?.thumbnails,
  ];
  return candidates.find((list) => Array.isArray(list) && list.length > 0) ?? [];
};

const ProductItem = ({
  item,
  hoverActions: _hoverActions = false,
}: {
  item: ProductItemData;
  /** Retained for call-site compatibility; the card is always interactive. */
  hoverActions?: boolean;
}) => (
  <ProductCard
    showDescription
    item={{
      id: item.id,
      title: item.title,
      price: item.price,
      discountedPrice: item.discountedPrice,
      images: pickImages(item),
      stock: item.stock,
      status: item.status,
      description: item.description,
      categoryName: item.category?.name ?? null,
      brandName: item.brand?.name ?? null,
      frameColors: item.frameColors ?? null,
      raw: item,
    }}
  />
);

export default ProductItem;
