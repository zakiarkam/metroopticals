"use client";

import React, { useEffect, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";

import OrderSummary from "./OrderSummary";
import SingleItem from "./SingleItem";
import SiteContainer from "@/components/common/SiteContainer";
import AdZoneClient from "@/features/advertisements/components/site/AdZoneClient";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import { useCart } from "@/features/cart/hooks/use-cart";
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

const Cart = () => {
  const { cartItems, clearCart, refreshCart, isAuthenticated, isLoading } =
    useCart();
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) void refreshCart();
  }, [isAuthenticated, refreshCart]);

  const handleConfirmClearCart = async () => {
    if (isClearing) return;
    setIsClearing(true);
    await clearCart();
    setIsClearing(false);
    setIsClearDialogOpen(false);
  };

  const itemCount = cartItems.reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0,
  );

  return (
    <>
      <PageHero
        eyebrow="Step 1 of 2"
        title="Your cart"
        description={
          cartItems.length
            ? `${itemCount} ${itemCount === 1 ? "item" : "items"} ready to check out. Add prescription lenses to any frame below — you will see the price before you pay.`
            : "Nothing here yet — everything you add will be saved to your account."
        }
        crumbs={[{ label: "Cart" }]}
        actions={
          cartItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsClearDialogOpen(true)}
              disabled={isClearing}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-red/40 px-5 text-[13px] font-semibold text-red transition-colors hover:bg-red hover:text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? "Clearing…" : "Clear cart"}
            </button>
          ) : null
        }
      />

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          {/* The loading branch used to replace the whole page including the
              header band, so the hero appeared only after the fetch settled. */}
          {isLoading ? (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
              <div className="h-72 animate-pulse rounded-2xl border border-gray-3 bg-gray-8" />
              <div className="h-80 animate-pulse rounded-2xl border border-gray-3 bg-gray-8" />
            </div>
          ) : cartItems.length > 0 ? (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
              <div className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2">
                <div className="flex items-center justify-between gap-4 border-b border-gray-3 px-5 py-4 sm:px-6">
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-dark">
                    Items
                  </p>
                  <p className="text-[12.5px] text-dark-5">
                    {cartItems.length}{" "}
                    {cartItems.length === 1 ? "product" : "products"}
                  </p>
                </div>

                <ul className="divide-y divide-gray-3">
                  {cartItems.map((item: { id: number }) => (
                    <li key={item.id}>
                      <SingleItem item={item as never} />
                    </li>
                  ))}
                </ul>
              </div>

              <OrderSummary />
            </div>
          ) : (
            <EmptyState
              icon={<ShoppingCart className="h-7 w-7" />}
              title="Your cart is empty"
              description="Browse the collection and add a frame — we'll hold it here while you decide on lenses."
              action={{ label: "Start shopping", href: "/shop-with-sidebar" }}
            />
          )}

          <AdZoneClient placement="cart-banner" className="mt-10" />
        </SiteContainer>
      </section>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear shopping cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all {cartItems.length} products from your cart. It
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearCart}
              disabled={isClearing}
              className="bg-red hover:bg-red-dark"
            >
              {isClearing ? "Clearing…" : "Clear cart"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Cart;
