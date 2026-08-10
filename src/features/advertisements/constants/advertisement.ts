import type { AdvertisementPlacement } from "@/features/advertisements/types/advertisement";

export const placementSlotOptions: Record<
  AdvertisementPlacement,
  number[]
> = {
  hero: [1, 2, 3],
  promobanner: [1, 2, 3],
  countdown: [1],
};
