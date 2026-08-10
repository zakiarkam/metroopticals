"use client";

import ClientProviders from "./ClientProviders";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// ? Lazy load modals - only needed when user interaction triggers them
const QuickViewModal = dynamic(
  () => import("@/components/modals/QuickViewModal"),
  {
    loading: () => null,
    ssr: false,
  }
);

const CartSidebarModal = dynamic(
  () => import("@/components/modals/CartSidebarModal"),
  {
    loading: () => null,
    ssr: false,
  }
);

const PreviewSliderModal = dynamic(
  () => import("@/components/modals/PreviewSlider"),
  {
    loading: () => null,
    ssr: false,
  }
);

// ? Lazy load WhatsApp button - not critical, can load after main content
const WhatsappButton = dynamic(
  () => import("@/components/common/WhatsappButton"),
  {
    loading: () => null,
    ssr: false,
  }
);

interface SiteLayoutProvidersProps {
  children: React.ReactNode;
}

// ? Inner content component with session handling (like AdminLayoutContent)
function SiteLayoutContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ? Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* ? Only render modals after mounted to prevent SSR issues */}
      <QuickViewModal />
      <CartSidebarModal />
      <PreviewSliderModal />
      <WhatsappButton />
    </>
  );
}

// ? Main providers wrapper (like AdminLayoutClient)
export default function SiteLayoutProviders({
  children,
}: SiteLayoutProvidersProps) {
  return (
    <ClientProviders>
      <SiteLayoutContent>{children}</SiteLayoutContent>
    </ClientProviders>
  );
}
