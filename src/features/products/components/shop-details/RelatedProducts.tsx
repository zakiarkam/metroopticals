"use client";

import React from "react";
import ProductCard from "@/components/common/ProductCard";
import ProductCardSkeleton from "@/components/common/Loaders/ProductCardSkeleton";
import { SectionHeading } from "@/components/common/Section";
import { useProducts } from "@/features/products/hooks/use-products";
import type { Product } from "@/features/products/types/product";

/**
 * "You may also like" rail on the product page.
 *
 * Pulls from the same category when the product has one, otherwise falls back
 * to the newest stock  so the block never renders empty on an uncategorised
 * product. Renders nothing at all if fewer than one sibling comes back.
 */
export default function RelatedProducts({
  currentId,
  categorySlug,
}: {
  currentId: number;
  categorySlug?: string;
}) {
  const { data, loading } = useProducts({
    page: 1,
    limit: 5,
    status: "ACTIVE",
    ...(categorySlug ? { category: categorySlug } : {}),
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const products = (data.products as Product[])
    .filter((p) => p.id !== currentId)
    .slice(0, 4);

  if (loading) {
    return (
      <section className="mt-14 lg:mt-20">
        <SectionHeading
          title="You may also like"
          titleAccent="More from the shelf."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="mt-14 lg:mt-20">
      <SectionHeading
        eyebrow="Keep looking"
        title="You may also like"
        titleAccent="More from the shelf."
        href="/shop-with-sidebar"
        hrefLabel="All frames"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {products.map((item) => (
          <ProductCard
            key={item.id}
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
              frameColors: item.frameColors ?? null,
              raw: item,
            }}
          />
        ))}
      </div>
    </section>
  );
}
