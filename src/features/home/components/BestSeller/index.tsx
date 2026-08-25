"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

import type { TopProduct } from "@/features/dashboard/types/dashboard";
import BestSellerRail from "./BestSellerRail";
import { getBestSellersCached } from "@/features/products/api/best-seller-api";
import { Section, SectionHeading } from "@/components/common/Section";
import EmptyState from "@/components/common/EmptyState";

const BestSeller = () => {
  const [displayedProducts, setDisplayedProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        setLoading(true);
        setError(null);
        const topProducts = await getBestSellersCached();
        setDisplayedProducts(
          topProducts.map((product: TopProduct) => ({
            ...product,
            title: product.name,
          }))
        );
      } catch (err) {
        console.error("BestSeller: unable to load data", err);
        setError("Failed to load best sellers");
        setDisplayedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBestSellers();
  }, []);

  return (
    <Section>
      <SectionHeading
        eyebrow="This month"
        title="Best sellers"
        titleAccent="The ones we restock most."
        description="The frames our customers keep coming back for."
        href="/shop-with-sidebar"
      />

      {error && (
        <div className="rounded-2xl border border-red/30 bg-red/10 px-5 py-4 text-[14px] text-red">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-4 lg:h-[420px] lg:flex-row">
          <div className="h-64 animate-pulse rounded-3xl bg-gray-8 lg:h-auto lg:flex-[2.6]" />
          <div className="h-24 animate-pulse rounded-3xl bg-gray-8 lg:h-auto lg:flex-1" />
          <div className="h-24 animate-pulse rounded-3xl bg-gray-8 lg:h-auto lg:flex-1" />
        </div>
      )}

      {!loading && displayedProducts.length > 0 && (
        <BestSellerRail items={displayedProducts.slice(0, 4)} />
      )}

      {!loading && !error && displayedProducts.length === 0 && (
        <EmptyState
          icon={<Flame className="h-7 w-7" />}
          title="Nothing to rank yet"
          description="We are still gathering sales data. In the meantime, the full range is worth a look."
          action={{ label: "Browse all frames", href: "/shop-with-sidebar" }}
        />
      )}
    </Section>
  );
};

export default BestSeller;
