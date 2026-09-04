"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
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
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  DESIGN_KIND_LABELS,
  LENS_POWER_CATEGORIES,
  categoryHasCyl,
  categoryHasSph,
  categoryNeedsAdd,
  overlappingBands,
  type LensPowerCategory,
} from "@/features/lenses/utils/pricing";
import {
  BAND_DEFAULTS,
  standardBandsForCategory,
  type BandGridOptions,
} from "@/features/lenses/constants/bands";
import { ADD_MIN, formatDiopter } from "@/features/lenses/constants/optics";
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

type DraftBand = Omit<LensPowerBand, "id"> & { id?: number; key: string };
type DraftTint = Omit<LensTint, "id"> & { id?: number; key: string };

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
  /** The whole sheet in one list; each row names the block it belongs to. */
  bands: DraftBand[];
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
  bands: [],
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
    bands: lensType.powerPrices.map((band) => ({ ...band, key: nextKey() })),
    tints: lensType.tints.map((tint) => ({ ...tint, key: nextKey() })),
  };
}

/** A row to type into by hand, shaped for the block it is being added to. */
const STARTER_BAND = (
  category: LensPowerCategory,
  sortOrder: number,
): DraftBand => ({
  key: nextKey(),
  category,
  label: "",
  sphMin: categoryHasSph(category) ? -3 : 0,
  sphMax: 0,
  cylMin: categoryHasCyl(category) ? -2 : 0,
  cylMax: categoryHasCyl(category) ? -0.25 : 0,
  addMin: categoryNeedsAdd(category) ? ADD_MIN : null,
  addMax: categoryNeedsAdd(category) ? 1.5 : null,
  price: 0,
  // The toric multifocal corner of the sheet is the one a shop normally has
  // to order in, so it starts ticked and can be unticked.
  isOrderLens:
    category === "SPH_CYL_ADD_BIFOCAL" ||
    category === "SPH_CYL_ADD_PROGRESSIVE",
  leadTimeDays: null,
  sortOrder,
});

/** A row's ranges, as a key - used to carry prices across a regeneration. */
const rangeKey = (band: {
  category: string;
  sphMin: number;
  sphMax: number;
  cylMin: number;
  cylMax: number;
  addMin: number | null;
  addMax: number | null;
}) =>
  [
    band.category,
    band.sphMin,
    band.sphMax,
    band.cylMin,
    band.cylMax,
    band.addMin ?? "",
    band.addMax ?? "",
  ].join("|");

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
        <span className="block text-[13px] font-semibold text-dark">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dark-5">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

/* ------------------------------ price block ----------------------------- */

/**
 * One block of the price sheet: every row that prices one shape of
 * prescription, for one build.
 *
 * Drawn per block rather than as one long table because the columns differ -
 * a sphere-only row has no cylinder to type and a cylinder-only row has no
 * sphere - and because this is how the shop reads its own sheet. It is also
 * what makes a full grid usable: the toric-with-addition block alone is
 * eighty-odd rows, and nobody types eighty prices one at a time, so the
 * block header carries the tools that fill it.
 */
function BandBlock({
  category,
  bands,
  clashes,
  onChange,
  gridOptions,
}: {
  category: LensPowerCategory;
  /** Every row of the build; this block edits the ones in its category. */
  bands: DraftBand[];
  clashes: Set<string>;
  onChange: (next: DraftBand[]) => void;
  gridOptions: BandGridOptions;
}) {
  const rows = useMemo(
    () => bands.filter((band) => band.category === category),
    [bands, category],
  );

  const [open, setOpen] = useState(rows.length > 0 && rows.length <= 30);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkLead, setBulkLead] = useState("");

  const showSph = categoryHasSph(category);
  const showCyl = categoryHasCyl(category);
  const showAdd = categoryNeedsAdd(category);
  const unpriced = rows.filter((band) => band.price === 0).length;
  const ordered = rows.filter((band) => band.isOrderLens).length;

  /**
   * Replace this block's rows, leaving every other block untouched.
   *
   * Rewritten in place rather than appended, so editing a cell does not
   * shuffle the build's rows to the bottom of the list on every keystroke.
   */
  const setRows = (next: DraftBand[]) => {
    const queue = [...next];
    const merged: DraftBand[] = [];

    for (const band of bands) {
      if (band.category !== category) {
        merged.push(band);
        continue;
      }
      const replacement = queue.shift();
      if (replacement) merged.push(replacement);
    }

    onChange([...merged, ...queue]);
  };

  const patchRow = (key: string, changes: Partial<DraftBand>) =>
    setRows(
      rows.map((band) => (band.key === key ? { ...band, ...changes } : band)),
    );

  /**
   * Lay the block out from the standard grid.
   *
   * Prices already typed against an identical range are carried across, so
   * regenerating after changing the step is not the same as starting again.
   */
  const generate = () => {
    const held = new Map(rows.map((band) => [rangeKey(band), band]));

    setRows(
      standardBandsForCategory(category, gridOptions).map((band, index) => {
        const previous = held.get(rangeKey(band));
        return {
          ...band,
          key: nextKey(),
          id: previous?.id,
          price: previous?.price ?? 0,
          isOrderLens: previous?.isOrderLens ?? band.isOrderLens,
          leadTimeDays: previous?.leadTimeDays ?? null,
          sortOrder: index,
        };
      }),
    );
    setOpen(true);
  };

  const fill = (onlyBlank: boolean) => {
    const price = Number(bulkPrice);
    if (!bulkPrice.trim() || !Number.isFinite(price) || price < 0) return;
    setRows(
      rows.map((band) =>
        onlyBlank && band.price !== 0 ? band : { ...band, price },
      ),
    );
  };

  const markAllOrdered = (next: boolean) => {
    const days = bulkLead.trim() === "" ? null : Number(bulkLead);
    setRows(
      rows.map((band) => ({
        ...band,
        isOrderLens: next,
        leadTimeDays: next
          ? Number.isFinite(days) && days !== null
            ? Math.round(days)
            : band.leadTimeDays
          : null,
      })),
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-3 bg-white">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-gray-3 bg-gray-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-[210px] flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-dark-4" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-dark-4" />
          )}
          <span>
            <span className="block text-[13px] font-bold text-dark">
              {CATEGORY_LABELS[category]}
            </span>
            <span className="block text-[11px] leading-relaxed text-dark-5">
              {CATEGORY_HINTS[category]}
            </span>
          </span>
        </button>

        <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-gray-3 px-2 py-0.5 text-dark-4">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
          {unpriced > 0 && (
            <span className="rounded-full bg-orange/15 px-2 py-0.5 text-orange-dark">
              {unpriced} unpriced
            </span>
          )}
          {ordered > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue/12 px-2 py-0.5 text-blue">
              <Clock className="h-3 w-3" />
              {ordered} order
            </span>
          )}
        </span>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={generate}
            title="Lay this block out from the standard grid, keeping prices already typed"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue/40 bg-blue/[0.08] px-2.5 text-[12px] font-semibold text-blue transition-colors hover:bg-blue/[0.14]"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {rows.length ? "Regenerate" : "Generate rows"}
          </button>
          <button
            type="button"
            onClick={() =>
              setRows([...rows, STARTER_BAND(category, rows.length)])
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-2.5 text-[12px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
          >
            <Plus className="h-3.5 w-3.5" />
            Row
          </button>
        </div>
      </div>

      {open && (
        <>
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-3 bg-gray-1 px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dark-4">
                Fill the block
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] text-dark-5">Rs</span>
                <input
                  type="number"
                  step="1"
                  value={bulkPrice}
                  onChange={(event) => setBulkPrice(event.target.value)}
                  aria-label={`Price for every ${CATEGORY_LABELS[category]} row`}
                  className="h-8 w-[96px] rounded-lg border border-gray-3 bg-white px-2 text-center text-[12.5px] font-semibold text-dark outline-none focus:border-blue"
                />
                <button
                  type="button"
                  onClick={() => fill(true)}
                  className="h-8 rounded-lg border border-gray-3 bg-white px-2.5 text-[12px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  Unpriced only
                </button>
                <button
                  type="button"
                  onClick={() => fill(false)}
                  className="h-8 rounded-lg border border-gray-3 bg-white px-2.5 text-[12px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  Every row
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] text-dark-5">
                  Order lens, days
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={bulkLead}
                  onChange={(event) => setBulkLead(event.target.value)}
                  placeholder="-"
                  aria-label={`Lead time for every ${CATEGORY_LABELS[category]} row`}
                  className="h-8 w-[70px] rounded-lg border border-gray-3 bg-white px-2 text-center text-[12.5px] font-semibold text-dark outline-none focus:border-blue"
                />
                <button
                  type="button"
                  onClick={() => markAllOrdered(true)}
                  className="h-8 rounded-lg border border-gray-3 bg-white px-2.5 text-[12px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  Mark all
                </button>
                <button
                  type="button"
                  onClick={() => markAllOrdered(false)}
                  className="h-8 rounded-lg border border-gray-3 bg-white px-2.5 text-[12px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="px-4 py-4 text-center text-[12px] leading-relaxed text-dark-5">
              Nothing priced in this block. A prescription of this shape is
              quoted as &ldquo;message us&rdquo; until there is a row for it.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-1 px-3 py-2.5">
                <thead>
                  <tr className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-dark-4">
                    <th className="px-1 pb-1 text-left">Row</th>
                    {showSph && (
                      <th className="px-1 pb-1" colSpan={2}>
                        Sphere
                      </th>
                    )}
                    {showCyl && (
                      <th className="px-1 pb-1" colSpan={2}>
                        Cylinder (minus)
                      </th>
                    )}
                    {showAdd && (
                      <th className="px-1 pb-1" colSpan={2}>
                        Addition
                      </th>
                    )}
                    <th className="px-1 pb-1">Price</th>
                    <th className="px-1 pb-1">Order lens</th>
                    <th className="px-1 pb-1">Days</th>
                    <th className="px-1 pb-1" />
                  </tr>
                </thead>

                <tbody>
                  {rows.map((band, index) => (
                    <tr
                      key={band.key}
                      className={clashes.has(band.key) ? "opacity-60" : ""}
                    >
                      <td className="pr-1.5">
                        <input
                          value={band.label ?? ""}
                          onChange={(event) =>
                            patchRow(band.key, { label: event.target.value })
                          }
                          placeholder="Standard"
                          aria-label="Row label"
                          className="h-10 w-full min-w-[150px] rounded-lg border border-gray-3 bg-white px-2.5 text-[12px] text-dark outline-none focus:border-blue"
                        />
                      </td>

                      {showSph && (
                        <>
                          <td className="px-1">
                            <NumberCell
                              ariaLabel="Sphere from"
                              value={band.sphMin}
                              onChange={(next) =>
                                patchRow(band.key, { sphMin: next ?? 0 })
                              }
                            />
                          </td>
                          <td className="px-1">
                            <NumberCell
                              ariaLabel="Sphere to"
                              value={band.sphMax}
                              onChange={(next) =>
                                patchRow(band.key, { sphMax: next ?? 0 })
                              }
                            />
                          </td>
                        </>
                      )}

                      {showCyl && (
                        <>
                          <td className="px-1">
                            <NumberCell
                              ariaLabel="Cylinder from"
                              value={band.cylMin}
                              onChange={(next) =>
                                patchRow(band.key, { cylMin: next ?? 0 })
                              }
                            />
                          </td>
                          <td className="px-1">
                            <NumberCell
                              ariaLabel="Cylinder to"
                              value={band.cylMax}
                              onChange={(next) =>
                                patchRow(band.key, { cylMax: next ?? 0 })
                              }
                            />
                          </td>
                        </>
                      )}

                      {showAdd && (
                        <>
                          <td className="px-1">
                            <NumberCell
                              ariaLabel="Addition from"
                              value={band.addMin}
                              onChange={(next) =>
                                patchRow(band.key, { addMin: next })
                              }
                            />
                          </td>
                          <td className="px-1">
                            <NumberCell
                              ariaLabel="Addition to"
                              value={band.addMax}
                              onChange={(next) =>
                                patchRow(band.key, { addMax: next })
                              }
                            />
                          </td>
                        </>
                      )}

                      <td className="px-1">
                        <NumberCell
                          ariaLabel="Price"
                          step={1}
                          value={band.price}
                          onChange={(next) =>
                            patchRow(band.key, { price: next ?? 0 })
                          }
                        />
                      </td>

                      <td className="px-1 text-center">
                        <input
                          type="checkbox"
                          checked={band.isOrderLens}
                          onChange={(event) =>
                            patchRow(band.key, {
                              isOrderLens: event.target.checked,
                              leadTimeDays: event.target.checked
                                ? band.leadTimeDays
                                : null,
                            })
                          }
                          aria-label="Made to order"
                          className="h-4 w-4 accent-blue-light"
                        />
                      </td>

                      <td className="px-1">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          disabled={!band.isOrderLens}
                          value={band.leadTimeDays ?? ""}
                          placeholder="-"
                          aria-label="Working days"
                          onChange={(event) =>
                            patchRow(band.key, {
                              leadTimeDays:
                                event.target.value === ""
                                  ? null
                                  : Math.max(
                                      0,
                                      Math.round(Number(event.target.value)),
                                    ),
                            })
                          }
                          className={`${inputCls} w-[70px] disabled:bg-gray-2 disabled:text-dark-5`}
                        />
                      </td>

                      <td className="pl-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setRows(
                              rows.filter((entry) => entry.key !== band.key),
                            )
                          }
                          aria-label={`Remove row ${index + 1}`}
                          className="grid h-10 w-10 place-items-center rounded-lg border border-gray-3 bg-white text-dark-4 transition-colors hover:border-red hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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

  /**
   * How the standard grid is cut, for this session only.
   *
   * Not stored: it describes how rows were LAID OUT, and once they are on
   * screen the rows themselves are the truth - a shop that regenerates at a
   * different step and then retypes two of them has a price list the setting
   * no longer describes.
   */
  const [grid, setGrid] = useState<Required<BandGridOptions>>({
    sphReach: BAND_DEFAULTS.sphReach,
    sphStep: BAND_DEFAULTS.sphStep,
    cylReach: BAND_DEFAULTS.cylReach,
    cylStep: BAND_DEFAULTS.cylStep,
    addBands: BAND_DEFAULTS.addBands,
  });

  /**
   * The blocks to draw: all seven, in the order the sheet reads, plus any
   * block that already holds rows. The second half is belt and braces - a row
   * saved under a block this build of the app does not know about stays
   * visible and deletable instead of vanishing with its price.
   */
  const blocks = useMemo<LensPowerCategory[]>(() => {
    const held = draft?.bands.map((band) => band.category) ?? [];
    return [...new Set([...LENS_POWER_CATEGORIES, ...held])];
  }, [draft]);

  /** Lay all seven blocks out from the standard grid at once. */
  const generateWholeSheet = useCallback(() => {
    setDraft((current) => {
      if (!current) return current;

      // Prices already typed against an identical range are carried across,
      // so laying the sheet out again is not the same as starting again.
      const held = new Map(current.bands.map((band) => [rangeKey(band), band]));

      const bands = LENS_POWER_CATEGORIES.flatMap((category) =>
        standardBandsForCategory(category, grid).map(
          (band, index) =>
            ({
              ...band,
              key: nextKey(),
              id: held.get(rangeKey(band))?.id,
              price: held.get(rangeKey(band))?.price ?? 0,
              isOrderLens:
                held.get(rangeKey(band))?.isOrderLens ?? band.isOrderLens,
              leadTimeDays: held.get(rangeKey(band))?.leadTimeDays ?? null,
              sortOrder: index,
            }) as DraftBand,
        ),
      );

      return { ...current, bands };
    });
  }, [grid]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The lens guide is synced into this table server-side on every load, so
      // a lens type or a colourway published on the site is already here - the
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
    if (
      draft.isActive &&
      draft.requiresPrescription &&
      draft.bands.length === 0 &&
      draft.basePrice <= 0
    ) {
      return Toast.error(
        "Add at least one price row, or a base price, before switching this lens on.",
      );
    }

    // Rows laid out from the sheet but never filled in. A zero price is a real
    // price - it quotes as free - so a lens where EVERY row is zero would give
    // the lenses away. Blocked rather than warned about, because the customer
    // would have already paid by the time anyone noticed.
    if (
      draft.isActive &&
      draft.requiresPrescription &&
      draft.bands.length > 0 &&
      draft.bands.every((band) => band.price === 0)
    ) {
      return Toast.error(
        "Every price row is 0, so this lens would be sold free. Fill the prices in before switching it on.",
      );
    }

    // A block priced at nothing is not an error - a shop may simply not sell
    // progressives in this coating - but it is worth saying out loud, because
    // the customer's side of it is a lens that quotes "message us".
    const emptyBlocks = LENS_POWER_CATEGORIES.filter(
      (category) => !draft.bands.some((band) => band.category === category),
    );

    const payload = {
      slug: draft.slug.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      groupLabel: draft.groupLabel.trim(),
      requiresPrescription: draft.requiresPrescription,
      basePrice: Number(draft.basePrice) || 0,
      sortOrder: Number(draft.sortOrder) || 0,
      isActive: draft.isActive,
      powerPrices: draft.bands.map(({ key, ...band }, index) => ({
        ...band,
        label: band.label ?? "",
        sortOrder: index,
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
      Toast.success(
        emptyBlocks.length && draft.isActive && draft.requiresPrescription
          ? `Saved. ${emptyBlocks.length} ${emptyBlocks.length === 1 ? "block has" : "blocks have"} no prices - those prescriptions quote as "message us".`
          : "Price list saved.",
      );
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

  /** Rows shadowed by one above them, per build - bands never cross builds. */
  const clashes = useMemo(() => {
    if (!draft) return new Set<string>();

    const bands = draft.bands.map((band, index) => ({
      ...band,
      id: index,
      label: band.label ?? null,
    }));
    const pairs = overlappingBands(bands as never);
    return new Set(pairs.map(([, second]) => draft.bands[second]?.key ?? ""));
  }, [draft]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Lens price list</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-dark-5">
            What a pair of lenses costs, by power. A customer&apos;s
            prescription is matched against these rows at checkout - the first
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
                <div
                  key={row}
                  className="h-16 animate-pulse rounded-xl bg-gray-3"
                />
              ))}
            </div>
          ) : lensTypes.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Glasses className="mx-auto h-7 w-7 text-dark-5" />
              <p className="mt-3 text-[13.5px] font-semibold text-dark">
                No lenses priced yet
              </p>
              <p className="mx-auto mt-1.5 max-w-[240px] text-[12px] leading-relaxed text-dark-5">
                Import the nine lens types the site already explains, then put a
                price against each one.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-3">
              {lensTypes.map((lensType) => {
                const selected = draft?.id === lensType.id;
                const bandCount = lensType.powerPrices.length;
                const priced = bandCount > 0 || lensType.basePrice > 0;
                // What the shop can actually sell this coating as, which is
                // decided by which blocks have rows in them.
                const kinds = lensType.designKinds ?? [];

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
                        {kinds.length > 0 && (
                          <>
                            <span>
                              {kinds
                                .map((kind) => DESIGN_KIND_LABELS[kind])
                                .join(" · ")}
                            </span>
                            <span aria-hidden>·</span>
                          </>
                        )}
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
                  onChange={(event) =>
                    patch({ description: event.target.value })
                  }
                  placeholder="Filters screen glare - for anyone at a desk all day."
                  className="h-11 w-full rounded-xl border border-gray-3 bg-white px-3.5 text-[14px] text-dark outline-none focus:border-blue"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-dark">
                  Group heading
                </span>
                <input
                  value={draft.groupLabel}
                  onChange={(event) =>
                    patch({ groupLabel: event.target.value })
                  }
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

            {/* ------------------------ prices ---------------------- */}
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-bold text-dark">
                    Price list
                  </h3>
                  <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-dark-5">
                    One sheet for this lens, in the seven blocks a price sheet
                    is written in. A prescription is read from the block that
                    matches its shape - and, when it has a reading addition,
                    from the bifocal or the progressive half of it, because
                    those are two different lenses to make. Inside a block the
                    first row that covers the eye wins; ranges are in{" "}
                    <strong>minus cylinder</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateWholeSheet}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue/40 bg-blue/[0.08] px-4 text-[13px] font-bold text-blue transition-colors hover:bg-blue/[0.14]"
                >
                  <Wand2 className="h-4 w-4" />
                  Lay out the whole sheet
                </button>
              </div>

              <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2.5 rounded-xl border border-gray-3 bg-gray-1 px-4 py-3">
                <div className="min-w-[190px] flex-1">
                  <p className="text-[12px] font-bold text-dark">
                    How the standard grid is cut
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-dark-5">
                    Used by &ldquo;generate rows&rdquo; below. Sphere runs plano
                    out to the reach, minus and plus priced separately;
                    regenerating keeps every price already typed against the
                    same range.
                  </p>
                </div>

                {(
                  [
                    { key: "sphReach", label: "Sphere to ±", step: 1 },
                    { key: "sphStep", label: "Sphere step", step: 0.25 },
                    { key: "cylReach", label: "Cylinder to -", step: 1 },
                    { key: "cylStep", label: "Cylinder step", step: 0.25 },
                    { key: "addBands", label: "ADD bands", step: 1 },
                  ] as const
                ).map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-dark-4">
                      {field.label}
                    </span>
                    <input
                      type="number"
                      step={field.step}
                      value={grid[field.key]}
                      onChange={(event) =>
                        setGrid((current) => ({
                          ...current,
                          [field.key]:
                            Number(event.target.value) || current[field.key],
                        }))
                      }
                      className="h-9 w-[92px] rounded-lg border border-gray-3 bg-white px-2 text-center text-[12.5px] font-semibold text-dark outline-none focus:border-blue"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-2.5">
                {blocks.map((category) => (
                  <BandBlock
                    key={category}
                    category={category}
                    bands={draft.bands}
                    clashes={clashes}
                    gridOptions={grid}
                    onChange={(bands) => patch({ bands })}
                  />
                ))}
              </div>

              {draft.bands.some((band) => band.price === 0) && (
                <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-blue/30 bg-blue/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-dark-3">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
                  A row priced at 0 is quoted to the customer as free, not as
                  unpriced - right if this lens is included with the frame,
                  wrong if you have not filled it in. Use &ldquo;unpriced
                  only&rdquo; on a block to fill them in one go.
                </p>
              )}

              {clashes.size > 0 && (
                <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-orange/40 bg-orange/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-dark-3">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-dark" />
                  Some rows overlap a row above them in the same block. Fine if
                  you meant it - the row above wins - but a row fully covered
                  will never be reached.
                </p>
              )}
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
                  No colours - the picker skips the colour step for this lens.
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
                          onChange={(event) =>
                            setTint({ hex: event.target.value })
                          }
                          className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-gray-3 bg-white p-1"
                        />

                        <input
                          value={tint.name}
                          onChange={(event) =>
                            setTint({ name: event.target.value })
                          }
                          placeholder="Grey"
                          aria-label="Colour name"
                          className="h-10 w-[120px] rounded-lg border border-gray-3 bg-white px-2.5 text-[13px] font-semibold text-dark outline-none focus:border-blue"
                        />

                        <input
                          value={tint.description ?? ""}
                          onChange={(event) =>
                            setTint({ description: event.target.value })
                          }
                          placeholder="Neutral - colours stay true"
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
                              setTint({
                                surcharge: Number(event.target.value) || 0,
                              })
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
                    const row = lensTypes.find(
                      (entry) => entry.id === draft.id,
                    );
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
            <AlertDialogTitle>Remove {pendingDelete?.name}?</AlertDialogTitle>
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
