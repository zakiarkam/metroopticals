/**
 * ✅ OPTIMIZED HOME PAGE - Dynamic imports + InView for heavy sections
 *
 * Keeps this file as a Server Component (best for performance).
 * - Hero3D loads immediately (above the fold)
 * - Other sections code-split with dynamic()
 * - BestSeller + Countdown load only when in view (IntersectionObserver)
 *
 * Ad placement is priority-driven:
 *   priority 0 → under <Categories />
 *   priority 1 → under <NewArrivals />
 *   priority 2 → under <BestSeller />
 * The component rendered at each position is determined by the ad's placement field.
 */

import dynamic from "next/dynamic";
import { getHomeAdvertisements } from "@/features/advertisements/services/advertisement-service";
import type { Advertisement } from "@/features/advertisements/types/advertisement";
import HomeSectionSkeleton from "./HomeSectionSkeleton";

// ✅ Above-the-fold
import Hero3D from "./Hero3D";

// ✅ Code-split (server-rendered, separate bundles)
const Categories = dynamic(() => import("./Categories"), {
  loading: () => <HomeSectionSkeleton height="h-32" />,
  ssr: true,
});

const Hero = dynamic(() => import("./Hero"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
  ssr: true,
});

const NewArrivals = dynamic(() => import("./NewArrivals"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
  ssr: true,
});

const PromoBanner = dynamic(() => import("./PromoBanner"), {
  loading: () => <HomeSectionSkeleton height="h-56" />,
  ssr: true,
});

const BestSeller = dynamic(() => import("./BestSeller"), {
  loading: () => <HomeSectionSkeleton height="h-72" />,
  ssr: true,
});

const Countdown = dynamic(() => import("./Countdown"), {
  loading: () => <HomeSectionSkeleton height="h-52" />,
  ssr: true,
});

/** Renders the correct component based on the placement field of the ads */
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

  return (
    <main>
      <Hero3D />
      <Categories />

      <AdSlot ads={position0} />

      <NewArrivals />

      <AdSlot ads={position1} />

      <BestSeller />

      <AdSlot ads={position2} />
    </main>
  );
};

export default Home;
