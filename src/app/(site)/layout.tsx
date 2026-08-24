import "../css/style.css";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/header";
import AnnouncementBar from "@/components/layout/header/AnnouncementBar";
import { getSiteBlocks } from "@/features/site-content/services/site-content-service";
import { getBrands } from "@/features/brands/services/brand-service";
import {
  getStockedFrameShapes,
  getStockedGenders,
} from "@/features/products/services/product-service";
import {
  FRAME_SHAPE_LABELS,
  GENDER_LABELS,
} from "@/features/products/utils/eyewear";
import type {
  NavCatalogue,
  NavItem,
} from "@/features/site-content/components/site/MegaMenu";
import SiteLayoutProviders from "./_components/SiteLayoutProviders";

// Below the fold — kept out of the initial bundle.
const Footer = dynamic(() => import("@/components/layout/footer"), {
  loading: () => <div className="h-80 bg-dark" />,
  ssr: true,
});

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The navigation needs content and catalogue rows together; both are cached
  // per request, and the brand list is optional so a DB hiccup only costs the
  // brands panel rather than the whole page.
  const [content, brands, shapes, genders] = await Promise.all([
    getSiteBlocks(["announcement.bar", "header.nav"]),
    getBrands().catch(() => []),
    getStockedFrameShapes().catch(() => []),
    getStockedGenders().catch(() => []),
  ]);

  const megaNav = (content["header.nav"]?.items ?? []) as NavItem[];
  // Every catalogue-sourced menu column is built from rows that have stock
  // behind them, so the menu can never offer a filter with nothing to show.
  const catalogue: NavCatalogue = {
    brands: brands
      .filter((brand) => brand.productCount > 0)
      .map((brand) => ({ label: brand.name, value: brand.slug })),
    shapes: shapes.map(({ value }) => ({
      value,
      label: FRAME_SHAPE_LABELS[value] ?? value,
    })),
    genders: genders.map(({ value }) => ({
      value,
      label: GENDER_LABELS[value] ?? value,
    })),
  };

  return (
    <SiteLayoutProviders>
      {/* Above the sticky header and in normal flow, so it scrolls away. */}
      <AnnouncementBar data={content["announcement.bar"]} />

      <Suspense
        fallback={
          <div className="sticky top-0 z-40 w-full border-b border-gray-3 bg-gray-2">
            <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
              <div className="h-[132px]" />
            </div>
          </div>
        }
      >
        <Header megaNav={megaNav} catalogue={catalogue} />
      </Suspense>

      {/* No padding offset — the header is sticky, not fixed, so it takes up
          its own space and can never sit on top of a page heading. */}
      <main>{children}</main>

      <Footer />
    </SiteLayoutProviders>
  );
}
