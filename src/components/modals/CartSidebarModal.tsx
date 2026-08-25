"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useCart } from "@/features/cart/hooks/use-cart";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CartSidebarModal = () => {
  const { isCartModalOpen, closeCartModal } = useCartModalContext();
  const { cartItems, updateQuantity, removeFromCart, refreshCart } = useCart();
  const fastPollMs = 10 * 1000;

  useEffect(() => {
    if (isCartModalOpen) {
      void refreshCart();
    }
  }, [isCartModalOpen, refreshCart]);

  useEffect(() => {
    if (!isCartModalOpen) return;

    const pollId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshCart();
    }, fastPollMs);

    return () => window.clearInterval(pollId);
  }, [isCartModalOpen, refreshCart, fastPollMs]);

  const calculateTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.discountedPrice * item.quantity,
      0
    );
  };

  const getFirstImage = (item: any) => {
    if (item.imgs?.previews && item.imgs.previews.length > 0) {
      return item.imgs.previews[0];
    }
    return "/images/placeholder-product.svg";
  };

  const total = calculateTotal();
  const itemCount = cartItems.reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0
  );

  return (
    <>
      {/* scrim */}
      <div
        onClick={closeCartModal}
        aria-hidden
        className={`fixed inset-0 z-99999 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isCartModalOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        aria-label="Shopping cart"
        aria-hidden={!isCartModalOpen}
        className={`fixed right-0 top-0 z-999999 flex h-[100dvh] w-full max-w-[420px] flex-col border-l border-gray-3 bg-gray-2 shadow-4 transition-transform duration-300 ${
          isCartModalOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ---------------------------- header ---------------------------- */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-3 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
              Your bag
            </p>
            <h2 className="mt-1 text-[17px] font-bold text-dark">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCartModal}
            aria-label="Close cart"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* ----------------------------- items ----------------------------- */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-3 bg-gray-1 text-blue">
                <ShoppingBag className="h-7 w-7" />
              </span>
              <h3 className="text-[16px] font-semibold text-dark">
                Your bag is empty
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-body">
                Add a frame and it will show up here.
              </p>
              <Link
                href="/shop-with-sidebar"
                onClick={closeCartModal}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue px-7 text-[13px] font-bold text-white transition-colors hover:bg-blue-dark"
              >
                Browse frames
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-3">
              {cartItems.map((item: any) => {
                const productUrl = `/shop-details/${item.productId ?? item.id}`;

                return (
                  <li key={item.id} className="flex gap-4 px-5 py-4 sm:px-6">
                    <Link
                      href={productUrl}
                      onClick={closeCartModal}
                      className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-1"
                    >
                      <Image
                        src={getFirstImage(item)}
                        alt={item.title}
                        fill
                        sizes="68px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        href={productUrl}
                        onClick={closeCartModal}
                        className="line-clamp-2 text-[13.5px] font-semibold capitalize text-dark transition-colors hover:text-blue"
                      >
                        {item.title}
                      </Link>

                      <p className="mt-1 text-[13px] font-bold text-blue">
                        {money(item.discountedPrice * item.quantity)}
                      </p>

                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex items-center overflow-hidden rounded-lg border border-gray-3 bg-gray-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="grid h-10 w-10 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="grid h-10 w-9 place-items-center border-x border-gray-3 text-[12.5px] font-bold text-dark sm:h-8 sm:w-8">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                            className="grid h-10 w-10 place-items-center text-dark transition-colors hover:text-blue sm:h-8 sm:w-8"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.title}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-3 text-dark-4 sm:h-8 sm:w-8 transition-colors hover:border-red hover:text-red"
                        >
                          <Trash2 className="h-[15px] w-[15px]" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ---------------------------- footer ---------------------------- */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold text-dark">
                Subtotal
              </span>
              <span className="text-xl font-bold text-blue">{money(total)}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-dark-5">
              Delivery calculated at checkout.
            </p>

            <div className="mt-5 space-y-2.5">
              <Link
                href="/checkout"
                onClick={closeCartModal}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/cart"
                onClick={closeCartModal}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-3 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
              >
                View cart
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartSidebarModal;
