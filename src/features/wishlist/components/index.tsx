"use client";

import React, { useEffect } from "react";
import { Heart, Lock, Trash2 } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import SingleItem from "./SingleItem";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";

export const Wishlist = () => {
  const { wishlistItems, clearWishlist, isAuthenticated, refreshWishlist } =
    useWishlist();
  const hasItems = wishlistItems.length > 0;

  useEffect(() => {
    if (isAuthenticated) void refreshWishlist();
  }, [isAuthenticated, refreshWishlist]);

  return (
    <>
      <PageHero
        eyebrow="Saved for later"
        title="Your wishlist"
        description={
          hasItems
            ? `${wishlistItems.length} ${wishlistItems.length === 1 ? "frame" : "frames"} you're keeping an eye on. We'll tell you if any go out of stock.`
            : "Save the frames you like and compare them side by side before you commit."
        }
        crumbs={[{ label: "Wishlist" }]}
        actions={
          hasItems ? (
            <button
              type="button"
              onClick={clearWishlist}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-red/40 px-5 text-[13px] font-semibold text-red transition-colors hover:bg-red hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
              Clear wishlist
            </button>
          ) : null
        }
      />

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          {!isAuthenticated ? (
            <EmptyState
              icon={<Lock className="h-7 w-7" />}
              title="Sign in to see your wishlist"
              description="Your saved frames follow your account, so they're waiting on any device you log into."
              action={{ label: "Sign in", href: "/log-in" }}
            />
          ) : hasItems ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlistItems.map((item: { id: number }) => (
                <SingleItem item={item as never} key={item.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Heart className="h-7 w-7" />}
              title="Nothing saved yet"
              description="Tap the heart on any frame while browsing and it will land here."
              action={{ label: "Browse frames", href: "/shop-with-sidebar" }}
            />
          )}
        </SiteContainer>
      </section>
    </>
  );
};
