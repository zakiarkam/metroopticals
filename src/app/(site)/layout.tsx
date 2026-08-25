import "../css/style.css";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
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

// Navigation, announcement and footer content are admin-editable.
export const dynamic = "force-dynamic";

// Below the fold  kept out of the initial bundle.
const Footer = nextDynamic(() => import("@/components/layout/footer"), {
  loading: () => <div className="h-80 bg-dark" />,
  ssr: true,
});

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, brands, shapes, genders] = await Promise.all([
    getSiteBlocks(["announcement.bar", "header.nav"]),
    getBrands().catch(() => []),
    getStockedFrameShapes().catch(() => []),
    getStockedGenders().catch(() => []),
  ]);

  const megaNav = (content["header.nav"]?.items ?? []) as NavItem[];
  const catalogue: NavCatalogue = {
    brands: brands
      // The logo travels with the row so the brands panel can draw the mark
      // rather than the name  see BrandColumn in MegaMenu.
      .map((brand) => ({
        label: brand.name,
        value: brand.slug,
        logo: brand.logo,
      })),
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

      {/* No padding offset  the header is sticky, not fixed, so it takes up
          its own space and can never sit on top of a page heading. */}
      <main>{children}</main>

      <Footer />
    </SiteLayoutProviders>
  );
}
