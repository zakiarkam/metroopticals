"use client";
import React, { useEffect } from "react";
import Breadcrumb from "@/components/common/Breadcrumb";
import SiteContainer from "@/components/common/SiteContainer";
import SingleItem from "./SingleItem";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";

export const Wishlist = () => {
  const { wishlistItems, clearWishlist, isAuthenticated, refreshWishlist } =
    useWishlist();
  const hasItems = wishlistItems.length > 0;

  useEffect(() => {
    if (isAuthenticated) {
      void refreshWishlist();
    }
  }, [isAuthenticated, refreshWishlist]);

  return (
    <>
      <section className="overflow-hidden py-8 bg-gray-2">
        <SiteContainer>
          <div className="flex flex-wrap items-center justify-between gap-5 mb-7.5">
            <h2 className="font-medium text-dark text-2xl">Your Wishlist</h2>
            <button
              onClick={clearWishlist}
              disabled={!hasItems}
              className="text-blue disabled:text-gray-4 disabled:cursor-not-allowed"
            >
              Clear Wishlist
            </button>
          </div>

          {!isAuthenticated && (
            <div className="bg-gray-2 rounded-[10px] shadow-1 p-10 text-center border border-gray-3">
              <p className="text-dark">
                Please sign in to view and manage your wishlist.
              </p>
            </div>
          )}

          {isAuthenticated && (
            <div className="bg-gray-2 rounded-[10px] shadow-1 border border-gray-3">
              {hasItems ? (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[1170px]">
                    {/* <!-- table header --> */}
                    <div className="flex items-center py-5.5 px-10">
                      <div className="min-w-[83px]"></div>
                      <div className="min-w-[387px]">
                        <p className="text-dark">Product</p>
                      </div>

                      <div className="min-w-[205px]">
                        <p className="text-dark">Unit Price</p>
                      </div>

                      <div className="min-w-[265px]">
                        <p className="text-dark">Stock Status</p>
                      </div>

                      <div className="min-w-[150px]">
                        <p className="text-dark text-right">Action</p>
                      </div>
                    </div>

                    {/* <!-- wish item --> */}
                    {wishlistItems.map((item, key) => (
                      <SingleItem item={item} key={key} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-dark">
                  <p>Your wishlist is empty.</p>
                </div>
              )}
            </div>
          )}
        </SiteContainer>
      </section>
    </>
  );
};
