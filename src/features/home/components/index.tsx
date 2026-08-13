/**
 * Home page composition.
 *
 * Order is deliberate — it walks a visitor from "what is this shop" to
 * "I'm ready to buy" and finally "come see us":
 *
 *   hero → promises → categories → new stock → shape finder → best sellers
 *        → lens education → order journey → social proof → store visit → FAQ
 *
 * Only the hero and the trust bar are in the initial bundle; everything below
 * the fold is code-split. Advertisement slots stay priority-driven:
 *   priority 0 → after <Categories />
 *   priority 1 → after <NewArrivals />
 *   priority 2 → after <BestSeller />
 */

import dynamic from "next/dynamic";
import { getHomeAdvertisements } from "@/features/advertisements/services/advertisement-service";
import type { Advertisement } from "@/features/advertisements/types/advertisement";
import HomeSectionSkeleton from "./HomeSectionSkeleton";

// ✅ Above-the-fold — shipped eagerly
import Hero3D from "./Hero3D";
import TrustBar from "./TrustBar";

// ✅ Code-split (still server-rendered, separate bundles)
const Categories = dynamic(() => import("./Categories"), {
  loading: () => <HomeSectionSkeleton height="h-64" />,
  ssr: true,
});

const Hero = dynamic(() => import("./Hero"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
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

const Countdown = dynamic(() => import("./Countdown"), {
  loading: () => <HomeSectionSkeleton height="h-52" />,
  ssr: true,
});

const FrameShapes = dynamic(() => import("./FrameShapes"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
  ssr: true,
});

const LensGuide = dynamic(() => import("./LensGuide"), {
  loading: () => <HomeSectionSkeleton height="h-80" />,
  ssr: true,
});

const HowItWorks = dynamic(() => import("./HowItWorks"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
  ssr: true,
});

const Testimonials = dynamic(() => import("./Testimonials"), {
  loading: () => <HomeSectionSkeleton height="h-80" />,
  ssr: true,
});

const VisitStore = dynamic(() => import("./VisitStore"), {
  loading: () => <HomeSectionSkeleton height="h-96" />,
  ssr: true,
});

const FaqPreview = dynamic(() => import("./FaqPreview"), {
  loading: () => <HomeSectionSkeleton height="h-80" />,
  ssr: true,
});

/** Renders the correct component based on the placement field of the ads. */
function AdSlot({ ads }: { ads: Advertisement[] }) {
  if (!ads.length) return null;
  const placement = ads[0].placement;
  if (placement === "hero") return <Hero ads={ads} />;
  if (placement === "promobanner") return <PromoBanner ads={ads} />;
  if (placement === "countdown") return <Countdown advertisement={ads[0]} />;
  return null;
}

const Home = async () => {
  const { position0, position1, position2 } = await getHomeAdvertisements();

  // No <main> here — the site layout already provides one, and nesting two is
  // invalid HTML that screen readers report as a second landmark.
  return (
    <>
      <Hero3D />
      <TrustBar />

      <Categories />
      <AdSlot ads={position0} />

      <NewArrivals />
      <AdSlot ads={position1} />

      <FrameShapes />

      <BestSeller />
      <AdSlot ads={position2} />

      <LensGuide />
      <HowItWorks />
      <Testimonials />
      <VisitStore />
      <FaqPreview />
    </>
  );
};

export default Home;
