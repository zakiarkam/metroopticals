import React from "react";
import SiteContainer from "@/components/common/SiteContainer";
import { getBannerAdvertisements } from "@/features/advertisements/services/advertisement-service";
import type { AdvertisementPlacement } from "@/features/advertisements/types/advertisement";
import AdZoneView from "./AdZoneView";

/**
 * Server-rendered advertisement zone.
 *
 * Reads the database directly, so the artwork is in the HTML on first paint —
 * use this wherever the surrounding page is a server component. Inside client
 * trees (the shop, cart and product pages) use `AdZoneClient` instead.
 */
export default async function AdZone({
  placement,
  contained = true,
  className = "",
  priority = false,
}: {
  placement: AdvertisementPlacement;
  /** Wrap in the standard page gutter. Turn off when already inside one. */
  contained?: boolean;
  className?: string;
  priority?: boolean;
}) {
  // A dead advertisements table must never take the page down with it — the
  // zone falls back to its dummy artwork exactly as it does when unconfigured.
  const ads = await getBannerAdvertisements(placement).catch(() => []);

  const zone = (
    <AdZoneView placement={placement} ads={ads} priority={priority} />
  );

  if (!contained) {
    return <section className={className}>{zone}</section>;
  }

  return (
    <section className={className}>
      <SiteContainer>{zone}</SiteContainer>
    </section>
  );
}
