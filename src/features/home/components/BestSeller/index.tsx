"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TopProduct } from "@/features/dashboard/types/dashboard";
import SingleItem from "./SingleItem";
import { getBestSellersCached } from "@/features/products/api/best-seller-api";

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
    <section className="overflow-hidden my-8">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
        {/* <!-- section title --> */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="flex items-center gap-2.5 font-medium text-dark mb-1.5">
              <Image
                src="/images/icons/icon-07.svg"
                alt="icon"
                width={17}
                height={17}
              />
              This Month
            </span>
            <h2 className="font-semibold text-xl xl:text-heading-5 text-dark">
              Best Sellers
            </h2>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
          </div>
        )}

        {!loading && displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* <!-- Best Sellers item --> */}
            {displayedProducts.map((item) => (
              <SingleItem item={item} key={item.id} />
            ))}
          </div>
        ) : !loading ? (
          <div className="py-12 text-center text-body">
            We are still gathering the latest product insights. Check back soon.
          </div>
        ) : null}

        <div className="text-center mt-8">
          <Link
            href="/shop-with-sidebar"
            className="inline-flex font-medium text-custom-sm py-3 px-7 sm:px-12.5 rounded-md border-gray-3 border bg-gray-1 text-dark ease-out duration-200 hover:bg-dark hover:text-white hover:border-transparent"
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BestSeller;
