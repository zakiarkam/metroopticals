"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useCart } from "@/features/cart/hooks/use-cart";
import { toast } from "react-hot-toast";

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
    return "/images/placeholder-product.jpg";
  };

  return (
    <>
      {isCartModalOpen && (
        <div
          className="fixed inset-0 z-99999 bg-dark/20"
          onClick={closeCartModal}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-999999 flex h-screen w-full max-w-[400px] flex-col bg-white shadow-lg transition-transform duration-300 ${
          isCartModalOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-3 px-6 py-4">
          <h3 className="text-lg font-semibold text-dark">
            Shopping Cart ({cartItems.length})
          </h3>
          <button
            onClick={closeCartModal}
            className="text-dark-4 hover:text-dark"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-body">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const productUrl = item.productId
                  ? `/shop-details/${item.productId}`
                  : `/shop-details/${item.id}`;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 border-b border-gray-2 pb-4"
                  >
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-1">
                      <Image
                        src={getFirstImage(item)}
                        alt={item.title}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-1 flex-col">
                      <h4 className="text-custom-sm capitalize font-medium text-dark line-clamp-2">
                        <Link
                          href={productUrl}
                          onClick={closeCartModal}
                          className="block hover:text-blue"
                        >
                          {item.title}
                        </Link>
                      </h4>

                      {/* Status Badge */}
                      {((item as any).status === "INACTIVE" ||
                        (item as any).status === "OUT_OF_STOCK") && (
                        <div className="mt-0.5">
                          <span
                            className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                              (item as any).status === "INACTIVE"
                                ? "bg-orange/10 text-orange"
                                : "bg-red/10 text-red"
                            }`}
                          >
                            {(item as any).status === "INACTIVE"
                              ? "Inactive"
                              : "Out of Stock"}
                          </span>
                        </div>
                      )}

                      <p className="text-custom-sm text-blue font-semibold mt-1">
                        Rs - {item.discountedPrice.toFixed(2)}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={
                            item.quantity <= 1 ||
                            (item as any).status === "INACTIVE" ||
                            (item as any).status === "OUT_OF_STOCK"
                          }
                          className="flex h-6 w-6 items-center justify-center rounded border border-gray-3 hover:bg-gray-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className="text-custom-sm">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const hasReachedStock =
                              typeof item.stock === "number" &&
                              item.quantity >= item.stock;
                            if (hasReachedStock) {
                              toast.error("Maximum stock reached");
                              return;
                            }
                            updateQuantity(item.id, item.quantity + 1);
                          }}
                          disabled={
                            (typeof item.stock === "number" &&
                              item.quantity >= item.stock) ||
                            (item as any).status === "INACTIVE" ||
                            (item as any).status === "OUT_OF_STOCK"
                          }
                          className="flex h-6 w-6 items-center justify-center rounded border border-gray-3 hover:bg-gray-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            typeof item.stock === "number" &&
                            item.quantity >= item.stock
                              ? "Maximum stock reached"
                              : (item as any).status === "INACTIVE" ||
                                  (item as any).status === "OUT_OF_STOCK"
                                ? "Product unavailable"
                                : undefined
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red hover:text-red-dark"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M2.5 5H17.5M8.33333 9.16667V14.1667M11.6667 9.16667V14.1667M3.33333 5L4.16667 16.6667C4.16667 17.5 5 18.3333 5.83333 18.3333H14.1667C15 18.3333 15.8333 17.5 15.8333 16.6667L16.6667 5M7.5 5V3.33333C7.5 2.5 8.33333 1.66667 9.16667 1.66667H10.8333C11.6667 1.66667 12.5 2.5 12.5 3.33333V5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 &&
          (() => {
            const hasUnavailableItems = cartItems.some(
              (item: any) =>
                item.status === "INACTIVE" ||
                item.status === "OUT_OF_STOCK" ||
                (typeof item.stock === "number" && item.stock === 0)
            );

            return (
              <div className="border-t border-gray-3 px-6 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-custom-sm font-medium text-dark">
                    Subtotal:
                  </span>
                  <span className="text-lg font-semibold text-blue">
                    Rs - {calculateTotal().toFixed(2)}
                  </span>
                </div>

                {hasUnavailableItems && (
                  <div className="mb-3 p-2 bg-red/10 border border-red/20 rounded-lg">
                    <p className="text-[10px] text-red font-medium">
                      ⚠️ Cart has unavailable items
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Link
                    href="/cart"
                    onClick={closeCartModal}
                    className="block w-full rounded-lg border border-blue bg-blue py-3 text-center font-medium text-white hover:bg-blue-dark"
                  >
                    View Cart
                  </Link>
                  <Link
                    href={hasUnavailableItems ? "#" : "/checkout"}
                    onClick={(e) => {
                      if (hasUnavailableItems) {
                        e.preventDefault();
                        toast.error(
                          "Please remove unavailable items from cart first"
                        );
                      } else {
                        closeCartModal();
                      }
                    }}
                    className={`block w-full rounded-lg border border-gray-3 bg-white py-3 text-center font-medium text-dark hover:bg-gray-1 ${
                      hasUnavailableItems ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            );
          })()}
      </div>
    </>
  );
};

export default CartSidebarModal;
