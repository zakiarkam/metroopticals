"use client";
import React, { createContext, useContext, useState } from "react";

interface CartModalContextType {
  isCartModalOpen: boolean;
  openCartModal: () => void;
  closeCartModal: () => void;
}

const CartModalContext = createContext<CartModalContextType | undefined>(
  undefined
);

export const useCartModalContext = () => {
  const context = useContext(CartModalContext);
  if (!context) {
    throw new Error(
      "useCartModalContext must be used within a CartSidebarModalProvider"
    );
  }
  return context;
};

export const CartSidebarModalProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  const openCartModal = () => {
    setIsCartModalOpen(true);
  };

  const closeCartModal = () => {
    setIsCartModalOpen(false);
  };

  return (
    <CartModalContext.Provider
      value={{ isCartModalOpen, openCartModal, closeCartModal }}
    >
      {children}
    </CartModalContext.Provider>
  );
};
