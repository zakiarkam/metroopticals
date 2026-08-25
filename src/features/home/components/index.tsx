/**
 * Home page composition.
 *
 * Eleven sections, in the order a visitor actually needs them:
 *
 *   hero → brands → promises → browse → new in → offer → best sellers
 *        → campaigns → how it works → reviews → visit us
 *
 * It used to run to twenty-four, including five advertising slots and six
 * editable link lists (shapes, prices, chips, feature cards, try-on, social)
 * that all pointed at the same shop page. Those shortcuts now live where a
 * shopper looks for them  the filter sidebar and the navigation panels  so
 * the page is a route to the catalogue rather than a second copy of it.
 *
 * Only the hero and the trust bar are in the initial bundle; everything below
 * the fold is code-split.
 */

import dynamic from "next/dynamic";
import AdZone from "@/features/advertisements/components/site/AdZone";
import {
  BrandStrip,
  LiveReviews,
  PromoBanners,
} from "@/features/site-content/components/site/HomeBlocks";
import { getSiteBlocks } from "@/features/site-content/services/site-content-service";
import { getBrands } from "@/features/brands/services/brand-service";
import { getFeaturedReviews } from "@/features/reviews/services/review-service";
import { getHomePromoAdvertisements } from "@/features/advertisements/services/advertisement-service";
import HomeSectionSkeleton from "./HomeSectionSkeleton";

// Above the fold  shipped eagerly.
import HomeHero from "./HomeHero";
import TrustBar from "./TrustBar";

// Code-split (still server-rendered, separate bundles).
const Categories = dynamic(() => import("./Categories"), {
  loading: () => <HomeSectionSkeleton height="h-64" />,
  ssr: true,
});

const NewArrivals = dynamic(() => import("./NewArrivals"), {
  loading: () => <HomeSectionSkeleton height="h-96" />,
  ssr: true,
});

const PromoBanner = dynamic(() => import("./PromoBanner"), {
  loading: () => <HomeSectionSkeleton height="h-56" />,
  ssr: true,
});

const BestSeller = dynamic(() => import("./BestSeller"), {
  loading: () => <HomeSectionSkeleton height="h-96" />,
  ssr: true,
});

const HowItWorks = dynamic(() => import("./HowItWorks"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
  ssr: true,
});

const VisitStore = dynamic(() => import("./VisitStore"), {
  loading: () => <HomeSectionSkeleton height="h-96" />,
  ssr: true,
});

const CONTENT_KEYS = ["home.hero", "site.trust", "home.promos"];

const Home = async () => {
  // Ads, editable content, brands and published reviews are independent
  // sources, so all four load together rather than in series.
  const [promoAds, content, brands, reviews] = await Promise.all([
    getHomePromoAdvertisements(),
    getSiteBlocks(CONTENT_KEYS),
    getBrands().catch(() => []),
    getFeaturedReviews(3).catch(() => []),
  ]);

  // No <main> here  the site layout already provides one, and nesting two is
  // invalid HTML that screen readers report as a second landmark.
  return (
    <>
      <HomeHero data={content["home.hero"]} />
      <BrandStrip brands={brands} />
      <TrustBar data={content["site.trust"]} />

      <Categories />
      <NewArrivals />

      {/* The one scheduled advertisement on the page. */}
      {promoAds.length > 0 && <PromoBanner ads={promoAds} />}
      <AdZone placement="home-billboard" className="py-2 sm:py-4" />

      <BestSeller />
      <PromoBanners data={content["home.promos"]} />

      <HowItWorks />
      <LiveReviews reviews={reviews} />
      <VisitStore />
    </>
  );
};

export default Home;
