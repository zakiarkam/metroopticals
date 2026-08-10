"use client";

import { ReactNode } from "react";
import { ModalProvider } from "@/app/context/QuickViewModalContext";
import { CartSidebarModalProvider } from "@/app/context/CartSidebarModalContext";
import { PreviewSliderProvider } from "@/app/context/PreviewSliderContext";

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <CartSidebarModalProvider>
      <ModalProvider>
        <PreviewSliderProvider>{children}</PreviewSliderProvider>
      </ModalProvider>
    </CartSidebarModalProvider>
  );
}
