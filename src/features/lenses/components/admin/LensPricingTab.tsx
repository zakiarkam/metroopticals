"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Glasses,
  Info,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import {
  adminCreateLensType,
  adminDeleteLensType,
  adminGetLensTypes,
  adminUpdateLensType,
  type LensPowerBand,
  type LensTint,
  type LensType,
} from "@/features/lenses/api/lens-api";
import { invalidateLensCatalogue } from "@/features/lenses/hooks/use-lens-picker";
import { overlappingBands } from "@/features/lenses/utils/pricing";
import { standardBandsFor } from "@/features/lenses/constants/bands";
import { formatDiopter } from "@/features/lenses/constants/optics";
import { Toast } from "@/lib/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { LensDesign, LensDesignKind } from "@/features/lenses/api/lens-api";

type DraftBand = Omit<LensPowerBand, "id"> & { id?: number; key: string };
type DraftTint = Omit<LensTint, "id"> & { id?: number; key: string };
type DraftDesign = Omit<LensDesign, "id" | "powerPrices"> & {
  id?: number;
  key: string;
  bands: DraftBand[];
};

/**
 * What each build is, in the shop's own terms.
 *
 * `kind` is the part the software acts on — a bifocal or a progressive cannot
 * be made without a reading addition, a single vision lens has no use for one.
 * The name is free text because the shop sells more than one of each: a round
 * top and a flat top bifocal are different lenses at different prices, and the
 * price sheet lists them as separate rows.
 */
const DESIGN_KINDS: {
  value: LensDesignKind;
  label: string;
  hint: string;
  suggested: string[];
}[] = [
  {
    value: "SINGLE_VISION",
    label: "Single vision",
    hint: "One power across the lens. No reading addition.",
    suggested: ["Single Vision"],
  },
  {
    value: "BIFOCAL",
    label: "Bifocal",
    hint: "Distance and reading with a visible line. Needs an ADD.",
    suggested: ["Bifocal — Round Top", "Bifocal — Flat Top"],
  },
  {
    value: "PROGRESSIVE",
    label: "Progressive",
    hint: "Distance to reading with no line. Needs an ADD.",
    suggested: ["Progressive — Free Form", "Progressive — Vision Max"],
  },
];

type Draft = {
  id: number | null;
  slug: string;
  name: string;
  description: string;
  groupLabel: string;
  requiresPrescription: boolean;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  designs: DraftDesign[];
  tints: DraftTint[];
};

let keySeed = 0;
const nextKey = () => `k${(keySeed += 1)}`;

const EMPTY_DRAFT: Draft = {
  id: null,
  slug: "",
  name: "",
  description: "",
  groupLabel: "",
  requiresPrescription: true,
  basePrice: 0,
  sortOrder: 0,
  isActive: false,
  // A new lens starts as a single vision lens, because every lens is one.
  // Bifocal and progressive builds are added when the shop prices them.
  designs: [
    {
      key: nextKey(),
      kind: "SINGLE_VISION",
      name: "Single Vision",
      description: "One power across the whole lens.",
      sortOrder: 0,
      isActive: true,
      bands: [],
    },
  ],
  tints: [],
};

function toDraft(lensType: LensType): Draft {
  return {
    id: lensType.id,
    slug: lensType.slug,
    name: lensType.name,
    description: lensType.description ?? "",
    groupLabel: lensType.groupLabel ?? "",
    requiresPrescription: lensType.requiresPrescription,
    basePrice: lensType.basePrice,
    sortOrder: lensType.sortOrder,
    isActive: lensType.isActive,
    designs: lensType.designs.map((design) => ({
      ...design,
      key: nextKey(),
      bands: design.powerPrices.map((band) => ({ ...band, key: nextKey() })),
    })),
    tints: lensType.tints.map((tint) => ({ ...tint, key: nextKey() })),
  };
}

/** The row a shop adds first: everything ordinary, one price. */
const STARTER_BAND = (sortOrder: number): DraftBand => ({
  key: nextKey(),
  label: "",
  sphMin: -4,
  sphMax: 4,
  cylMin: -2,
  cylMax: 0,
  addMin: null,
  addMax: null,
  price: 0,
  sortOrder,
});

/* ------------------------------ small atoms ----------------------------- */

const inputCls =
  "h-10 w-full rounded-lg border border-gray-3 bg-white px-2.5 text-center text-[13px] font-semibold text-dark outline-none focus:border-blue";

function NumberCell({
  value,
  onChange,
  step = 0.25,
  placeholder,
  ariaLabel,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  step?: number;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      step={step}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={value === null ? "" : value}
      placeholder={placeholder}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
      className={inputCls}
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-blue-light"
      />
      <span>
        <span className="block text-[13px] font-semibold text-dark">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dark-5">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * One build's price rows.
 *
 * Extracted because the grid is now drawn once per build, and a lens with a
 * single vision, a bifocal and two progressives would otherwise be four copies
 * of the same 90 lines of table.
 */
function BandGrid({
  bands,
  clashes,
  onChange,
}: {
  bands: DraftBand[];
  clashes: Set<string>;
  onChange: (next: DraftBand[]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-1.5">
        <thead>
          <tr className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-dark-4">
            <th className="px-1 pb-1 text-left">Label</th>
            <th className="px-1 pb-1" colSpan={2}>
              Sphere
            </th>
            <th className="px-1 pb-1" colSpan={2}>
              Cylinder (minus)
            </th>
            <th className="px-1 pb-1" colSpan={2}>
              Addition
            </th>
            <th className="px-1 pb-1">Price</th>
            <th className="px-1 pb-1" />
          </tr>
        </thead>

        <tbody>
          {bands.map((band, index) => {
            const setBand = (changes: Partial<DraftBand>) =>
              onChange(
                bands.map((entry, i) =>
                  i === index ? { ...entry, ...changes } : entry,
                ),
              );

            return (
              <tr
                key={band.key}
                className={clashes.has(band.key) ? "opacity-60" : ""}
              >
                <td className="pr-1.5">
                  <input
                    value={band.label ?? ""}
                    onChange={(event) => setBand({ label: event.target.value })}
                    placeholder="Standard"
                    aria-label="Row label"
                    className="h-10 w-full min-w-[110px] rounded-lg border border-gray-3 bg-white px-2.5 text-[12.5px] text-dark outline-none focus:border-blue"
                  />
                </td>

                <td className="px-1">
                  <NumberCell
                    ariaLabel="Sphere from"
                    value={band.sphMin}
                    onChange={(next) => setBand({ sphMin: next ?? 0 })}
                  />
                </td>
                <td className="px-1">
                  <NumberCell
                    ariaLabel="Sphere to"
                    value={band.sphMax}
                    onChange={(next) => setBand({ sphMax: next ?? 0 })}
                  />
                </td>

                <td className="px-1">
                  <NumberCell
                    ariaLabel="Cylinder from"
                    value={band.cylMin}
                    onChange={(next) => setBand({ cylMin: next ?? 0 })}
                  />
                </td>
                <td className="px-1">
                  <NumberCell
                    ariaLabel="Cylinder to"
                    value={band.cylMax}
                    onChange={(next) => setBand({ cylMax: next ?? 0 })}
                  />
                </td>

                <td className="px-1">
                  <NumberCell
                    ariaLabel="Addition from"
                    value={band.addMin}
                    placeholder="any"
                    onChange={(next) => setBand({ addMin: next })}
                  />
                </td>
                <td className="px-1">
                  <NumberCell
                    ariaLabel="Addition to"
                    value={band.addMax}
                    placeholder="any"
                    onChange={(next) => setBand({ addMax: next })}
                  />
                </td>

                <td className="px-1">
                  <NumberCell
                    ariaLabel="Price"
                    step={1}
                    value={band.price}
                    onChange={(next) => setBand({ price: next ?? 0 })}
                  />
                </td>

                <td className="pl-1.5">
                  <button
                    type="button"
                    onClick={() => onChange(bands.filter((_, i) => i !== index))}
                    aria-label={`Remove row ${index + 1}`}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-gray-3 bg-white text-dark-4 transition-colors hover:border-red hover:text-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ================================= tab ================================== */

export default function LensPricingTab() {
  const [lensTypes, setLensTypes] = useState<LensType[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LensType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The lens guide is synced into this table server-side on every load, so
      // a lens type or a colourway published on the site is already here — the
      // shop only ever has to put a price against it.
      const { lensTypes: rows, added } = await adminGetLensTypes();
      setLensTypes(rows);

      if (added.createdTypes || added.createdTints) {
        const parts = [
          added.createdTypes &&
            `${added.createdTypes} lens ${added.createdTypes === 1 ? "type" : "types"}`,
          added.createdTints &&
            `${added.createdTints} ${added.createdTints === 1 ? "colour" : "colours"}`,
        ].filter(Boolean);
        Toast.success(`Added ${parts.join(" and ")} from the lens guide.`);
      }
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "Couldn't load the lens price list.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (changes: Partial<Draft>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  /* ------------------------------ saving ------------------------------ */

  const save = async () => {
    if (!draft) return;

    if (!draft.name.trim()) return Toast.error("Give the lens a name.");
    if (!draft.slug.trim()) return Toast.error("Give the lens a slug.");

    // Switching a lens on with nothing priced would offer customers a lens
    // that quotes as "call us" on every prescription.
    if (draft.designs.length === 0) {
      return Toast.error("A lens needs at least one build — start with Single Vision.");
    }

    const anyBands = draft.designs.some((design) => design.bands.length > 0);
    if (
      draft.isActive &&
      draft.requiresPrescription &&
      !anyBands &&
      draft.basePrice <= 0
    ) {
      return Toast.error(
        "Add at least one price row, or a base price, before switching this lens on.",
      );
    }

    const unpriced = draft.designs.find(
      (design) =>
        design.isActive && design.bands.length === 0 && draft.basePrice <= 0,
    );
    if (draft.isActive && draft.requiresPrescription && unpriced) {
      return Toast.error(
        `"${unpriced.name}" is switched on with no prices — every prescription would be quoted as "call us".`,
      );
    }

    // Rows laid out from the sheet but never filled in. A zero price is a real
    // price — it quotes as free — so a build where EVERY row is zero would
    // give the lenses away. Blocked rather than warned about, because the
    // customer would have already paid by the time anyone noticed.
    const allFree = draft.designs.find(
      (design) =>
        design.isActive &&
        design.bands.length > 0 &&
        design.bands.every((band) => band.price === 0),
    );
    if (draft.isActive && draft.requiresPrescription && allFree) {
      return Toast.error(
        `Every price row on "${allFree.name}" is 0, so it would be sold free. Fill the prices in, or switch that build off.`,
      );
    }

    const payload = {
      slug: draft.slug.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      groupLabel: draft.groupLabel.trim(),
      requiresPrescription: draft.requiresPrescription,
      basePrice: Number(draft.basePrice) || 0,
      sortOrder: Number(draft.sortOrder) || 0,
      isActive: draft.isActive,
      designs: draft.designs.map(({ key, bands, ...design }, index) => ({
        ...design,
        description: design.description ?? "",
        sortOrder: index,
        powerPrices: bands.map(({ key: bandKey, ...band }, bandIndex) => ({
          ...band,
          label: band.label ?? "",
          sortOrder: bandIndex,
        })),
      })),
      tints: draft.tints.map(({ key, ...tint }, index) => ({
        ...tint,
        hex: tint.hex ?? "",
        description: tint.description ?? "",
        sortOrder: index,
      })),
    };

    setSaving(true);
    try {
      if (draft.id) {
        await adminUpdateLensType(draft.id, payload);
      } else {
        await adminCreateLensType(payload);
      }
      // The storefront shares one cached copy of the catalogue; without this
      // a shopper on an open tab keeps the old prices until they reload.
      invalidateLensCatalogue();
      Toast.success("Price list saved.");
      setDraft(null);
      await load();
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "Couldn't save the price list.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      const result = await adminDeleteLensType(pendingDelete.id);
      invalidateLensCatalogue();
      Toast.success(result.message);
      if (draft?.id === pendingDelete.id) setDraft(null);
      await load();
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "Couldn't remove it.");
    } finally {
      setPendingDelete(null);
    }
  };

  /* ------------------------------ render ------------------------------ */

  /** Rows shadowed by one above them, per build — bands never cross builds. */
  const clashesByDesign = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!draft) return map;

    for (const design of draft.designs) {
      const bands = design.bands.map((band, index) => ({
        ...band,
        id: index,
        label: band.label ?? null,
      }));
      const pairs = overlappingBands(bands as never);
      map.set(
        design.key,
        new Set(pairs.map(([, second]) => design.bands[second]?.key ?? "")),
      );
    }
    return map;
  }, [draft]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Lens price list</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-dark-5">
            What a pair of lenses costs, by power. A customer&apos;s
            prescription is matched against these rows at checkout — the first
            row that covers both eyes wins, and the pair is charged from the
            stronger eye. Ranges are written in <strong>minus cylinder</strong>;
            a prescription written in plus cyl is transposed before it is
            matched.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() =>
              setDraft({ ...EMPTY_DRAFT, sortOrder: lensTypes.length * 10 })
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-4 text-[13px] font-bold text-white transition-colors hover:bg-blue-dark"
          >
            <Plus className="h-4 w-4" />
            New lens
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* ------------------------- lens list ------------------------- */}
        <div className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2">
          <p className="border-b border-gray-3 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-dark-4">
            Lenses ({lensTypes.length})
          </p>

          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-xl bg-gray-3" />
              ))}
            </div>
          ) : lensTypes.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Glasses className="mx-auto h-7 w-7 text-dark-5" />
              <p className="mt-3 text-[13.5px] font-semibold text-dark">
                No lenses priced yet
              </p>
              <p className="mx-auto mt-1.5 max-w-[240px] text-[12px] leading-relaxed text-dark-5">
                Import the nine lens types the site already explains, then put
                a price against each one.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-3">
              {lensTypes.map((lensType) => {
                const selected = draft?.id === lensType.id;
                const bandCount = lensType.designs.reduce(
                  (total, design) => total + design.powerPrices.length,
                  0,
                );
                const priced = bandCount > 0 || lensType.basePrice > 0;

                return (
                  <li key={lensType.id}>
                    <button
                      type="button"
                      onClick={() => setDraft(toDraft(lensType))}
                      className={`w-full px-4 py-3.5 text-left transition-colors ${
                        selected ? "bg-blue/[0.08]" : "hover:bg-gray-1"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-bold text-dark">
                          {lensType.name}
                        </span>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            lensType.isActive
                              ? "bg-green/15 text-green"
                              : "bg-gray-3 text-dark-4"
                          }`}
                        >
                          {lensType.isActive ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {lensType.isActive ? "Live" : "Off"}
                        </span>
                      </span>

                      <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-dark-5">
                        <span>{lensType.groupLabel || "Ungrouped"}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {lensType.designs.length}{" "}
                          {lensType.designs.length === 1 ? "build" : "builds"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {bandCount} price {bandCount === 1 ? "row" : "rows"}
                        </span>
                        {lensType.tints.length > 0 && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{lensType.tints.length} colours</span>
                          </>
                        )}
                      </span>

                      {!priced && (
                        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-orange-dark">
                          <AlertTriangle className="h-3 w-3" />
                          No price set
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* -------------------------- editor -------------------------- */}
        {draft ? (
          <div className="space-y-5 rounded-2xl border border-gray-3 bg-gray-2 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[17px] font-bold text-dark">
                {draft.id ? draft.name || "Lens" : "New lens"}
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Close editor"
                className="grid h-9 w-9 place-items-center rounded-xl text-dark-4 transition-colors hover:bg-gray-3 hover:text-dark"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ----------------------- identity ---------------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                  Name
                </span>
                <input
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder="Blue Cut"
                  className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 text-[14px] text-dark outline-none focus:border-blue"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                  Slug
                </span>
                <input
                  value={draft.slug}
                  onChange={(event) =>
                    patch({ slug: event.target.value.toLowerCase() })
                  }
                  placeholder="blue-cut"
                  className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 font-mono text-[13px] text-dark outline-none focus:border-blue"
                />
                <span className="mt-1 block text-[11px] text-dark-5">
                  Matches the guide page at /lenses/&lt;slug&gt; when there is
                  one, so the picker can link to it.
                </span>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                  One-line description
                </span>
                <input
                  value={draft.description}
                  onChange={(event) => patch({ description: event.target.value })}
                  placeholder="Filters screen glare — for anyone at a desk all day."
                  className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 text-[14px] text-dark outline-none focus:border-blue"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                  Group heading
                </span>
                <input
                  value={draft.groupLabel}
                  onChange={(event) => patch({ groupLabel: event.target.value })}
                  placeholder="Screen & indoor"
                  className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 text-[14px] text-dark outline-none focus:border-blue"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                  Order on the picker
                </span>
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(event) =>
                    patch({ sortOrder: Number(event.target.value) || 0 })
                  }
                  className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 text-[14px] text-dark outline-none focus:border-blue"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3.5 rounded-xl border border-gray-3 bg-gray-1 p-4 sm:grid-cols-2">
              <Toggle
                checked={draft.requiresPrescription}
                onChange={(next) => patch({ requiresPrescription: next })}
                label="Needs a prescription"
                hint="Off for plano and fashion lenses, which are sold at the base price."
              />
              <Toggle
                checked={draft.isActive}
                onChange={(next) => patch({ isActive: next })}
                label="Offered to customers"
                hint="Off keeps it out of the picker while you price it."
              />
            </div>

            <label className="block max-w-xs">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                Base price (Rs)
              </span>
              <input
                type="number"
                step="1"
                value={draft.basePrice}
                onChange={(event) =>
                  patch({ basePrice: Number(event.target.value) || 0 })
                }
                className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 text-[14px] text-dark outline-none focus:border-blue"
              />
              <span className="mt-1 block text-[11px] leading-relaxed text-dark-5">
                The whole price for a lens that needs no prescription, and the
                fallback for one with no price rows below. Left at 0 with no
                rows, the lens quotes as &ldquo;call us&rdquo;.
              </span>
            </label>

            {/* ----------------------- builds ----------------------- */}
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-bold text-dark">
                    Builds &amp; prices
                  </h3>
                  <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-dark-5">
                    The same lens costs different money made as a single vision,
                    a bifocal or a progressive — so each build keeps its own
                    price rows. Rows are tried top to bottom and the first that
                    covers an eye wins; ranges are in{" "}
                    <strong>minus cylinder</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DESIGN_KINDS.map((kind) => (
                    <button
                      key={kind.value}
                      type="button"
                      onClick={() =>
                        patch({
                          designs: [
                            ...draft.designs,
                            {
                              key: nextKey(),
                              kind: kind.value,
                              // Suggest the shop's own wording, then step
                              // aside — they may sell two of this kind.
                              name:
                                kind.suggested.find(
                                  (name) =>
                                    !draft.designs.some(
                                      (design) => design.name === name,
                                    ),
                                ) ?? `${kind.label} ${draft.designs.length + 1}`,
                              description: kind.hint,
                              sortOrder: draft.designs.length,
                              isActive: true,
                              bands: [],
                            },
                          ],
                        })
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-3 text-[12.5px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {kind.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {draft.designs.map((design, designIndex) => {
                  const setDesign = (changes: Partial<DraftDesign>) =>
                    patch({
                      designs: draft.designs.map((entry, i) =>
                        i === designIndex ? { ...entry, ...changes } : entry,
                      ),
                    });

                  const setBands = (bands: DraftBand[]) => setDesign({ bands });
                  const clashes =
                    clashesByDesign.get(design.key) ?? new Set<string>();
                  const needsAdd = design.kind !== "SINGLE_VISION";

                  return (
                    <div
                      key={design.key}
                      className={`rounded-xl border bg-gray-1 p-4 ${
                        design.isActive ? "border-gray-3" : "border-dashed border-gray-4 opacity-70"
                      }`}
                    >
                      {/* ---------------- build header ---------------- */}
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-[180px] flex-1">
                          <input
                            value={design.name}
                            onChange={(event) =>
                              setDesign({ name: event.target.value })
                            }
                            placeholder="Bifocal — Round Top"
                            aria-label="Build name"
                            className="h-10 w-full rounded-lg border border-gray-3 bg-white px-3 text-[13.5px] font-bold text-dark outline-none focus:border-blue"
                          />
                          <input
                            value={design.description ?? ""}
                            onChange={(event) =>
                              setDesign({ description: event.target.value })
                            }
                            placeholder="One line the customer reads under the name"
                            aria-label="Build description"
                            className="mt-1.5 h-9 w-full rounded-lg border border-gray-3 bg-white px-3 text-[12px] text-dark outline-none focus:border-blue"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`kind-${design.key}`}
                            className="mb-1 block text-[11px] font-semibold text-dark-4"
                          >
                            Kind
                          </label>
                          <select
                            id={`kind-${design.key}`}
                            value={design.kind}
                            onChange={(event) =>
                              setDesign({
                                kind: event.target.value as LensDesignKind,
                              })
                            }
                            className="h-10 w-[150px] cursor-pointer rounded-lg border border-gray-3 bg-white px-2.5 text-[13px] font-semibold text-dark outline-none focus:border-blue"
                          >
                            {DESIGN_KINDS.map((kind) => (
                              <option key={kind.value} value={kind.value}>
                                {kind.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end gap-2 pb-0.5">
                          <button
                            type="button"
                            onClick={() => setDesign({ isActive: !design.isActive })}
                            title={design.isActive ? "Offered" : "Hidden"}
                            className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                              design.isActive
                                ? "border-green/40 bg-green/10 text-green"
                                : "border-gray-3 bg-white text-dark-5"
                            }`}
                          >
                            {design.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                designs: draft.designs.filter(
                                  (_, i) => i !== designIndex,
                                ),
                              })
                            }
                            aria-label={`Remove ${design.name || "build"}`}
                            className="grid h-10 w-10 place-items-center rounded-lg border border-gray-3 bg-white text-dark-4 transition-colors hover:border-red hover:text-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {needsAdd && (
                        <p className="mt-2.5 flex items-start gap-2 text-[11.5px] leading-relaxed text-dark-5">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
                          The picker will require a reading addition for this
                          build, and refuse to price it without one. Narrow a
                          row on the ADD columns if you charge by it.
                        </p>
                      )}

                      {/* ----------------- price rows ----------------- */}
                      <div className="mt-3.5 border-t border-gray-3 pt-3.5">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-dark-4">
                            {design.bands.length} price{" "}
                            {design.bands.length === 1 ? "row" : "rows"}
                          </p>

                          <div className="flex gap-2">
                            {design.bands.length === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setBands(
                                    standardBandsFor(design.kind).map(
                                      (band, index) => ({
                                        ...band,
                                        key: nextKey(),
                                        addMin: band.addMin ?? null,
                                        addMax: band.addMax ?? null,
                                        price: 0,
                                        sortOrder: index,
                                      }),
                                    ),
                                  )
                                }
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue/40 bg-blue/[0.08] px-3 text-[12.5px] font-semibold text-blue transition-colors hover:bg-blue/[0.14]"
                              >
                                <Wand2 className="h-3.5 w-3.5" />
                                Rows from the price sheet
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setBands([
                                  ...design.bands,
                                  STARTER_BAND(design.bands.length),
                                ])
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-3 text-[12.5px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add row
                            </button>
                          </div>
                        </div>

                        {design.bands.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-gray-4 px-4 py-4 text-center text-[12px] leading-relaxed text-dark-5">
                            No prices for this build yet. Lay out the rows from
                            your printed price sheet —{" "}
                            {design.kind === "SINGLE_VISION"
                              ? "sphere, cylinder and toric, minus and plus priced separately"
                              : "one row for plus powers and one for minus, both capped at a +3.00 addition"}{" "}
                            — then type the prices in.
                          </p>
                        ) : (
                          <BandGrid
                            bands={design.bands}
                            clashes={clashes}
                            onChange={setBands}
                          />
                        )}

                        {design.bands.some((band) => band.price === 0) && (
                          <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-blue/30 bg-blue/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-dark-3">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
                            A row priced at 0 is quoted to the customer as free,
                            not as unpriced — right if this build is included
                            with the frame, wrong if you have not filled it in.
                          </p>
                        )}

                        {clashes.size > 0 && (
                          <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-orange/40 bg-orange/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-dark-3">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-dark" />
                            Some rows overlap a row above them. Fine if you meant
                            it — the row above wins — but a row fully covered
                            will never be reached.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ------------------------ tints ----------------------- */}
            <section>
              <div className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-bold text-dark">
                    Colours &amp; tints
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-dark-5">
                    Offered as a step in the picker. The surcharge is added to
                    whichever power row matched.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    patch({
                      tints: [
                        ...draft.tints,
                        {
                          key: nextKey(),
                          name: "",
                          hex: "#6b7280",
                          description: "",
                          surcharge: 0,
                          sortOrder: draft.tints.length,
                          isActive: true,
                        },
                      ],
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-3 text-[12.5px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add colour
                </button>
              </div>

              {draft.tints.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-4 px-4 py-5 text-center text-[12.5px] text-dark-5">
                  No colours — the picker skips the colour step for this lens.
                </p>
              ) : (
                <ul className="space-y-2">
                  {draft.tints.map((tint, index) => {
                    const setTint = (changes: Partial<DraftTint>) =>
                      patch({
                        tints: draft.tints.map((entry, i) =>
                          i === index ? { ...entry, ...changes } : entry,
                        ),
                      });

                    return (
                      <li
                        key={tint.key}
                        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-gray-3 bg-gray-1 p-2.5"
                      >
                        <input
                          type="color"
                          aria-label={`Swatch for ${tint.name || "colour"}`}
                          value={tint.hex || "#6b7280"}
                          onChange={(event) => setTint({ hex: event.target.value })}
                          className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-gray-3 bg-white p-1"
                        />

                        <input
                          value={tint.name}
                          onChange={(event) => setTint({ name: event.target.value })}
                          placeholder="Grey"
                          aria-label="Colour name"
                          className="h-10 w-[120px] rounded-lg border border-gray-3 bg-white px-2.5 text-[13px] font-semibold text-dark outline-none focus:border-blue"
                        />

                        <input
                          value={tint.description ?? ""}
                          onChange={(event) =>
                            setTint({ description: event.target.value })
                          }
                          placeholder="Neutral — colours stay true"
                          aria-label="Colour description"
                          className="h-10 min-w-[180px] flex-1 rounded-lg border border-gray-3 bg-white px-2.5 text-[12.5px] text-dark outline-none focus:border-blue"
                        />

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11.5px] font-medium text-dark-5">
                            + Rs
                          </span>
                          <input
                            type="number"
                            step="1"
                            aria-label="Surcharge"
                            value={tint.surcharge}
                            onChange={(event) =>
                              setTint({ surcharge: Number(event.target.value) || 0 })
                            }
                            className="h-10 w-[92px] rounded-lg border border-gray-3 bg-white px-2.5 text-center text-[13px] font-semibold text-dark outline-none focus:border-blue"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setTint({ isActive: !tint.isActive })}
                          title={tint.isActive ? "Offered" : "Hidden"}
                          className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                            tint.isActive
                              ? "border-green/40 bg-green/10 text-green"
                              : "border-gray-3 bg-white text-dark-5"
                          }`}
                        >
                          {tint.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            patch({
                              tints: draft.tints.filter((_, i) => i !== index),
                            })
                          }
                          aria-label={`Remove ${tint.name || "colour"}`}
                          className="grid h-10 w-10 place-items-center rounded-lg border border-gray-3 bg-white text-dark-4 transition-colors hover:border-red hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ------------------------ actions ---------------------- */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-3 pt-4">
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const row = lensTypes.find((entry) => entry.id === draft.id);
                    if (row) setPendingDelete(row);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-3 px-4 text-[13px] font-semibold text-dark-4 transition-colors hover:border-red hover:text-red"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove lens
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="inline-flex h-11 items-center rounded-xl border border-gray-3 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save price list
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-gray-4 bg-gray-2 px-6 py-12 text-center">
            <div>
              <Glasses className="mx-auto h-8 w-8 text-dark-5" />
              <p className="mt-3 text-[14px] font-semibold text-dark">
                Pick a lens to price it
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-dark-5">
                Choose one from the list, or import the lens types the site
                already has guide pages for and price those.
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If this lens has already been sold it is switched off instead of
              deleted, so the orders it is on keep their record. Otherwise it
              and its price list are removed for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-red hover:bg-red-dark"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
