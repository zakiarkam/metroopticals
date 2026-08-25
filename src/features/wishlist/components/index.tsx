"use client";

import React, { useEffect, useState } from "react";
import { Heart, Lock, Trash2 } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import ProductCard from "@/components/common/ProductCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";

/** The shape the wishlist slice stores; wider than what the card needs. */
type WishlistItem = {
  id: number;
  title: string;
  price: number;
  discountedPrice?: number | null;
  stock?: number;
  status?: string;
  imgs?: { thumbnails?: string[]; previews?: string[] };
};

export const Wishlist = () => {
  const {
    wishlistItems,
    clearWishlist,
    removeFromWishlist,
    isAuthenticated,
    refreshWishlist,
  } = useWishlist();
  const hasItems = wishlistItems.length > 0;
  const [confirmClear, setConfirmClear] = useState(false);

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
              onClick={() => setConfirmClear(true)}
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
            <div className="flex flex-col gap-4">
              {(wishlistItems as WishlistItem[]).map((item) => (
                <ProductCard
                  key={item.id}
                  layout="list"
                  onRemove={async () => {
                    await removeFromWishlist(item.id);
                  }}
                  item={{
                    id: item.id,
                    title: item.title,
                    price: item.price,
                    discountedPrice: item.discountedPrice ?? null,
                    images: item.imgs?.previews ?? item.imgs?.thumbnails ?? [],
                    stock: item.stock,
                    status: item.status,
                    raw: item,
                  }}
                />
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

      {/* Clearing the wishlist used to happen on the first click, while the
          equivalent action in the cart asked first. Both ask now. */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your wishlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all {wishlistItems.length} saved frames. You can save
              them again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void clearWishlist();
                setConfirmClear(false);
              }}
            >
              Clear wishlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
