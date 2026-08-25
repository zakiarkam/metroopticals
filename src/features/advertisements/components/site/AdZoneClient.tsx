"use client";

import React, { useEffect, useState } from "react";
import { getAdvertisements } from "@/features/advertisements/api/advertisement-api";
import type {
  Advertisement,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";
import { AD_PLACEMENTS } from "@/features/advertisements/constants/advertisement";
import AdZoneView from "./AdZoneView";

/**
 * Client advertisement zone, for pages whose surrounding tree is already
 * client-side (shop, cart, product details).
 *
 * The dummy artwork renders first and real ads swap in once the public
 * endpoint answers. That ordering is deliberate: these zones sit below the
 * fold, and showing finished-looking artwork immediately beats reserving a
 * blank box while the request is in flight.
 */
export default function AdZoneClient({
  placement,
  className = "",
}: {
  placement: AdvertisementPlacement;
  className?: string;
}) {
  const [ads, setAds] = useState<Advertisement[]>([]);

  useEffect(() => {
    let active = true;
    const meta = AD_PLACEMENTS[placement];

    getAdvertisements({
      placement,
      status: "active",
      limit: meta ? meta.slots.length : 3,
    })
      .then((data) => {
        if (!active) return;
        // The list endpoint is not date-filtered, so scheduling is applied here.
        const now = Date.now();
        const live = (data.advertisements || []).filter((ad) => {
          const startsOk =
            !ad.startDate || new Date(ad.startDate).getTime() <= now;
          const endsOk = !ad.endDate || new Date(ad.endDate).getTime() >= now;
          return startsOk && endsOk;
        });
        setAds(live);
      })
      .catch(() => {
        // Keep the placeholders  a failed ad fetch is not worth surfacing.
      });

    return () => {
      active = false;
    };
  }, [placement]);

  return <AdZoneView placement={placement} ads={ads} className={className} />;
}
