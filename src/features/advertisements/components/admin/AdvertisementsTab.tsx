"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  CalendarClock,
  ImageOff,
  LayoutTemplate,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import AddAdvertisementDialog from "./modals/AddAdvertisementDialog";
import EditAdvertisementDialog from "./modals/EditAdvertisementDialog";
import AdvertisementStatusDialog from "./modals/AdvertisementStatusDialog";
import DeleteAlertDialog from "@/components/modals/DeleteAlertDialog";
import { deleteAdvertisement } from "@/features/advertisements/api/advertisement-api";
import type {
  Advertisement,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";
import {
  AD_PLACEMENTS,
  AD_PLACEMENT_GROUPS,
  AD_PLACEMENT_IDS,
  type AdPlacementMeta,
} from "@/features/advertisements/constants/advertisement";
import { getAdvertisementImageUrl } from "@/lib/storageUtils";
import { Toast } from "@/lib/utils/toast";
import { useGetAdvertisementsQuery } from "@/store/services/api";

type ZoneFilter = "all" | AdPlacementMeta["group"];

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

/** An ad can be active but outside its window  worth calling out. */
const liveState = (ad: Advertisement) => {
  if (ad.status !== "active") return "paused" as const;
  const now = Date.now();
  if (ad.startDate && new Date(ad.startDate).getTime() > now)
    return "scheduled" as const;
  if (ad.endDate && new Date(ad.endDate).getTime() < now)
    return "expired" as const;
  return "live" as const;
};

const STATE_STYLES: Record<string, string> = {
  live: "border-green/25 bg-green-light-6 text-green",
  scheduled: "border-blue/25 bg-blue-light-5 text-blue",
  expired: "border-orange/25 bg-orange-light-5 text-orange",
  paused: "border-gray-3 bg-gray-1 text-dark-4",
};

const STATE_LABELS: Record<string, string> = {
  live: "Live",
  scheduled: "Scheduled",
  expired: "Ended",
  paused: "Paused",
};

const StatCard = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) => (
  <div className="rounded-2xl border border-gray-3 bg-gray-2 p-5">
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-light-5 text-blue">
        {icon}
      </span>
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-dark-4">
          {label}
        </p>
        <p className="text-[22px] font-bold leading-tight text-dark">{value}</p>
      </div>
    </div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-dark-4">{hint}</p>
  </div>
);

/** One configured advertisement inside a zone. */
const AdCard = ({
  ad,
  meta,
  onEdit,
  onStatus,
  onDelete,
}: {
  ad: Advertisement;
  meta: AdPlacementMeta;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) => {
  const image = getAdvertisementImageUrl(ad.imageUrl);
  const state = liveState(ad);
  const start = formatDate(ad.startDate);
  const end = formatDate(ad.endDate);

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 transition-shadow hover:shadow-2">
      <div
        className="relative w-full overflow-hidden bg-gray-1"
        style={{ aspectRatio: meta.aspect }}
      >
        {image ? (
          <Image
            src={image}
            alt={ad.title}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover"
            unoptimized={image.endsWith(".svg")}
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-dark-5">
            <ImageOff className="h-6 w-6" />
          </span>
        )}

        <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-dark/70 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white backdrop-blur">
          Slot {ad.slot ?? 1}
        </span>

        <button
          type="button"
          onClick={onStatus}
          title="Change status"
          className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide backdrop-blur transition-transform hover:scale-105 ${STATE_STYLES[state]}`}
        >
          {STATE_LABELS[state]}
        </button>
      </div>

      <div className="p-4">
        <p className="truncate text-[14px] font-semibold text-dark">
          {ad.title}
        </p>

        <p className="mt-1 truncate text-[12.5px] text-dark-4">
          {ad.link || (ad.product ? ad.product.title : "Not clickable")}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-dark-4">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            {start || end
              ? `${start ?? "Now"} → ${end ?? "No end"}`
              : "Always on"}
          </span>
          <span>
            {ad.viewCount.toLocaleString()} views ·{" "}
            {ad.clickCount.toLocaleString()} clicks
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-gray-1 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete advertisement"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-3 bg-gray-1 text-dark-4 transition-colors hover:border-red hover:text-red"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/** An unfilled slot  shows the dummy artwork the site is currently using. */
const EmptySlotCard = ({
  meta,
  slotIndex,
  onAdd,
}: {
  meta: AdPlacementMeta;
  slotIndex: number;
  onAdd: () => void;
}) => (
  <button
    type="button"
    onClick={onAdd}
    className="group overflow-hidden rounded-2xl border-2 border-dashed border-gray-3 bg-gray-1 text-left transition-colors hover:border-blue"
  >
    <div
      className="relative w-full overflow-hidden opacity-55 transition-opacity group-hover:opacity-80"
      style={{ aspectRatio: meta.aspect }}
    >
      <Image
        src={meta.placeholders[slotIndex % meta.placeholders.length]}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 420px"
        unoptimized
        className="object-cover"
      />
    </div>
    <div className="flex items-center gap-2 p-4">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-light-5 text-blue">
        <Plus className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[13.5px] font-semibold text-dark">
          Slot {meta.slots[slotIndex]} is empty
        </span>
        <span className="block text-[12px] text-dark-4">
          Sample artwork is showing upload a photo to replace it.
        </span>
      </span>
    </div>
  </button>
);

type AdvertisementsTabProps = {
  dateRange?: string;
};

const AdvertisementsTab: React.FC<AdvertisementsTabProps> = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [addPlacement, setAddPlacement] = useState<
    AdvertisementPlacement | undefined
  >();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Advertisement | null>(null);
  const [statusTarget, setStatusTarget] = useState<Advertisement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // The board shows every ad at once  grouping happens client-side, so the
  // page load is one request rather than one per zone.
  const { data, isLoading, error, refetch } = useGetAdvertisementsQuery(
    { limit: 100 },
    { refetchOnFocus: true },
  );

  useEffect(() => {
    if (!error) return;
    Toast.error(
      (error as any)?.data?.message || "Could not load advertisements.",
    );
  }, [error]);

  const advertisements = useMemo(
    () => data?.advertisements ?? [],
    [data?.advertisements],
  );

  const byPlacement = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const grouped = new Map<string, Advertisement[]>();

    advertisements
      .filter((ad) =>
        term
          ? ad.title.toLowerCase().includes(term) ||
            (ad.link || "").toLowerCase().includes(term)
          : true,
      )
      .forEach((ad) => {
        const list = grouped.get(ad.placement) ?? [];
        list.push(ad);
        grouped.set(ad.placement, list);
      });

    grouped.forEach((list) =>
      list.sort(
        (a, b) => (a.slot ?? 1) - (b.slot ?? 1) || b.priority - a.priority,
      ),
    );

    return grouped;
  }, [advertisements, debouncedSearch]);

  const stats = useMemo(() => {
    const live = advertisements.filter((ad) => liveState(ad) === "live").length;
    const zonesFilled = AD_PLACEMENT_IDS.filter((id) =>
      advertisements.some(
        (ad) => ad.placement === id && ad.status === "active",
      ),
    ).length;
    const clicks = advertisements.reduce((sum, ad) => sum + ad.clickCount, 0);

    return { live, zonesFilled, clicks, total: advertisements.length };
  }, [advertisements]);

  const openAdd = useCallback((placement?: AdvertisementPlacement) => {
    setAddPlacement(placement);
    setIsAddOpen(true);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const toastId = Toast.loading(`Deleting "${deleteTarget.title}"…`);

    try {
      await deleteAdvertisement(deleteTarget.id);
      Toast.update(toastId, {
        render: "Advertisement deleted.",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      Toast.update(toastId, {
        render:
          err?.response?.data?.message ||
          err?.message ||
          "Could not delete the advertisement.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleGroups = AD_PLACEMENT_GROUPS.filter(
    (group) => zoneFilter === "all" || zoneFilter === group,
  );

  return (
    <div className="space-y-6">
      {/* ------------------------------- header ------------------------------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-dark">
            Advertisements
          </h2>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-dark-4">
            Every advertising zone on the storefront. Empty slots fall back to
            sample artwork, so the site always looks complete upload a photo to
            take one over.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAdd()}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-blue px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
        >
          <Plus className="h-4 w-4" />
          New advertisement
        </button>
      </div>

      {/* -------------------------------- stats ------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Live now"
          value={stats.live}
          hint="Active and inside their scheduled window."
        />
        <StatCard
          icon={<LayoutTemplate className="h-5 w-5" />}
          label="Zones filled"
          value={`${stats.zonesFilled} / ${AD_PLACEMENT_IDS.length}`}
          hint="Zones with at least one active advertisement."
        />
        <StatCard
          icon={<Pencil className="h-5 w-5" />}
          label="Total ads"
          value={stats.total}
          hint="Including paused and expired campaigns."
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Clicks"
          value={stats.clicks.toLocaleString()}
          hint="Recorded across every advertisement."
        />
      </div>

      {/* ------------------------------- filters ------------------------------ */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-3 bg-gray-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search advertisements…"
            className="h-10 w-full rounded-xl border border-gray-3 bg-gray-1 pl-10 pr-4 text-[13.5px] text-dark outline-none transition-colors placeholder:text-dark-5 focus:border-blue"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-3 bg-gray-1 p-1">
          {(["all", ...AD_PLACEMENT_GROUPS] as ZoneFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setZoneFilter(option)}
              className={`h-8 rounded-lg px-3.5 text-[12.5px] font-semibold capitalize transition-colors ${
                zoneFilter === option
                  ? "bg-gray-2 text-blue shadow-1"
                  : "text-dark-4 hover:text-dark"
              }`}
            >
              {option === "all" ? "All pages" : option}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------- zones ------------------------------- */}
      {isLoading && advertisements.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-gray-3 bg-gray-1"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {visibleGroups.map((group) => {
            const placements = AD_PLACEMENT_IDS.filter(
              (id) => AD_PLACEMENTS[id].group === group,
            );

            return (
              <div key={group} className="space-y-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-[16px] font-bold text-dark">
                    {group} page
                  </h3>
                  <span className="h-px flex-1 bg-gray-3" />
                </div>

                {placements.map((placementId) => {
                  const meta = AD_PLACEMENTS[placementId];
                  const ads = byPlacement.get(placementId) ?? [];

                  return (
                    <section
                      key={placementId}
                      className="rounded-2xl border border-gray-3 bg-gray-1 p-5"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[15px] font-semibold text-dark">
                              {meta.label}
                            </h4>
                            <span className="rounded-full border border-gray-3 bg-gray-2 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-dark-4">
                              {meta.kind === "banner"
                                ? "Photo banner"
                                : "Product driven"}
                            </span>
                          </div>
                          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-dark-4">
                            {meta.description} Recommended size{" "}
                            {meta.recommended}.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openAdd(placementId)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add photo
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {ads.map((ad) => (
                          <AdCard
                            key={ad.id}
                            ad={ad}
                            meta={meta}
                            onEdit={() => setEditTarget(ad)}
                            onStatus={() => setStatusTarget(ad)}
                            onDelete={() => setDeleteTarget(ad)}
                          />
                        ))}

                        {/* Show one empty-slot prompt per slot the zone can
                            render but nothing has claimed yet. */}
                        {meta.slots
                          .map((slot, index) => ({ slot, index }))
                          .filter(
                            ({ slot }) =>
                              !ads.some((ad) => (ad.slot ?? 1) === slot),
                          )
                          .map(({ slot, index }) => (
                            <EmptySlotCard
                              key={`empty-${placementId}-${slot}`}
                              meta={meta}
                              slotIndex={index}
                              onAdd={() => openAdd(placementId)}
                            />
                          ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------- dialogs ------------------------------ */}
      <AddAdvertisementDialog
        isOpen={isAddOpen}
        defaultPlacement={addPlacement}
        onClose={() => setIsAddOpen(false)}
        onSuccess={refetch}
      />

      <EditAdvertisementDialog
        isOpen={Boolean(editTarget)}
        advertisement={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={refetch}
      />

      <AdvertisementStatusDialog
        isOpen={Boolean(statusTarget)}
        advertisementId={statusTarget?.id ?? null}
        advertisementTitle={statusTarget?.title ?? ""}
        currentStatus={statusTarget?.status ?? "active"}
        onClose={() => setStatusTarget(null)}
        onSuccess={refetch}
      />

      <DeleteAlertDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Delete advertisement?"
        description="This removes the advertisement from the site immediately. It cannot be undone."
        itemName={deleteTarget?.title}
      />
    </div>
  );
};

export default AdvertisementsTab;
