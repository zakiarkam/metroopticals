"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type {
  FrameSizeBucket,
  ProductFacets,
} from "@/features/products/types/product";
import {
  FRAME_SHAPE_LABELS,
  GENDER_LABELS,
  RIM_TYPE_LABELS,
} from "@/features/products/utils/eyewear";

const SIZE_LABELS: Record<FrameSizeBucket, string> = {
  SMALL: "Small (under 48mm)",
  MEDIUM: "Medium (48–53mm)",
  LARGE: "Large (54mm+)",
};

/** The filter dimensions this sidebar controls, in display order. */
export type FilterKey =
  | "genders"
  | "brands"
  | "sizes"
  | "shapes"
  | "colors"
  | "materials"
  | "rimTypes";

export type FilterSelection = Record<FilterKey, string[]>;

export const EMPTY_SELECTION: FilterSelection = {
  genders: [],
  brands: [],
  sizes: [],
  shapes: [],
  colors: [],
  materials: [],
  rimTypes: [],
};

interface ShopFiltersProps {
  facets: ProductFacets | null;
  selection: FilterSelection;
  onChange: (next: FilterSelection) => void;
  onClearAll: () => void;
  /** Price section is owned by the parent, rendered at the end. */
  priceSlot?: React.ReactNode;
  loading?: boolean;
}

type Option = { value: string; label: string; count: number };

const Section = ({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <div className="border-b border-gray-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[13.5px] font-bold uppercase tracking-[0.1em] text-dark">
          {title}
        </span>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-3 text-dark-4 transition-colors group-hover:border-blue group-hover:text-blue">
          {open ? (
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </span>
      </button>
      {open && <div className="space-y-1 pb-4">{children}</div>}
    </div>
  );
};

const CheckboxRow = ({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label
    className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[13px] transition-colors hover:bg-gray-8 xl:min-h-0 ${
      checked ? "bg-blue/[0.08]" : ""
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-blue-light"
    />
    <span
      className={`min-w-0 break-words capitalize ${checked ? "font-semibold text-blue" : "text-body"}`}
    >
      {label}
    </span>
    <span className="ml-auto shrink-0 text-[11px] font-medium text-dark-5">{count}</span>
  </label>
);

export default function ShopFilters({
  facets,
  selection,
  onChange,
  onClearAll,
  priceSlot,
  loading = false,
}: ShopFiltersProps) {
  const toggle = useCallback(
    (key: FilterKey, value: string) => {
      const current = selection[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      onChange({ ...selection, [key]: next });
    },
    [onChange, selection],
  );

  const activeCount = useMemo(
    () => Object.values(selection).reduce((n, list) => n + list.length, 0),
    [selection],
  );

  /** Facet rows mapped to display labels, in sidebar order. */
  const groups = useMemo((): {
    key: FilterKey;
    title: string;
    options: Option[];
  }[] => {
    if (!facets) return [];

    return [
      {
        key: "genders",
        title: "Gender",
        options: facets.genders.map((g) => ({
          value: g.value,
          label: GENDER_LABELS[g.value] ?? g.value,
          count: g.count,
        })),
      },
      {
        key: "brands",
        title: "Brands",
        options: facets.brands.map((b) => ({
          value: b.value,
          label: b.label,
          count: b.count,
        })),
      },
      {
        key: "sizes",
        title: "Size",
        options: facets.sizes.map((s) => ({
          value: s.value,
          label: SIZE_LABELS[s.value] ?? s.value,
          count: s.count,
        })),
      },
      {
        key: "shapes",
        title: "Shape",
        options: facets.shapes.map((s) => ({
          value: s.value,
          label: FRAME_SHAPE_LABELS[s.value] ?? s.value,
          count: s.count,
        })),
      },
      {
        key: "colors",
        title: "Colour",
        options: facets.colors.map((c) => ({
          value: c.value,
          label: c.value,
          count: c.count,
        })),
      },
      {
        key: "materials",
        title: "Material",
        options: facets.materials.map((m) => ({
          value: m.value,
          label: m.value,
          count: m.count,
        })),
      },
      {
        key: "rimTypes",
        title: "Rim",
        options: facets.rimTypes.map((r) => ({
          value: r.value,
          label: RIM_TYPE_LABELS[r.value] ?? r.value,
          count: r.count,
        })),
      },
    ];
  }, [facets]);

  return (
    <aside className="rounded-2xl border border-gray-3 bg-gray-2 px-4 shadow-2">
      {activeCount > 0 && (
        <div className="flex items-center justify-between border-b border-gray-3 py-3">
          <span className="text-[12px] font-semibold text-dark-4">
            {activeCount} {activeCount === 1 ? "filter" : "filters"} applied
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex min-h-10 items-center text-[12px] font-semibold text-blue transition-opacity hover:opacity-80 xl:min-h-0"
          >
            Reset
          </button>
        </div>
      )}

      {loading && !facets ? (
        <div className="space-y-3 py-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-8" />
          ))}
        </div>
      ) : (
        <>
          {groups.map((group, index) => (
            <Section
              key={group.key}
              title={group.title}
              count={group.options.length}
              // Gender open by default, matching the reference layout.
              defaultOpen={index === 0}
            >
              {group.options.map((opt) => (
                <CheckboxRow
                  key={`${group.key}:${opt.value}`}
                  label={opt.label}
                  count={opt.count}
                  checked={(selection[group.key] ?? []).includes(opt.value)}
                  onToggle={() => toggle(group.key, opt.value)}
                />
              ))}
            </Section>
          ))}

          {priceSlot && (
            <Section title="Price" count={1}>
              {priceSlot}
            </Section>
          )}
        </>
      )}
    </aside>
  );
}

/** Read the current selection out of URL search params. */
export const selectionFromParams = (
  params: URLSearchParams,
): FilterSelection => {
  const read = (key: FilterKey) => {
    const raw = params.getAll(key).flatMap((v) => v.split(","));
    return raw.map((v) => v.trim()).filter(Boolean);
  };
  return {
    genders: read("genders"),
    brands: read("brands"),
    sizes: read("sizes"),
    shapes: read("shapes"),
    colors: read("colors"),
    materials: read("materials"),
    rimTypes: read("rimTypes"),
  };
};

/** Hook that keeps a FilterSelection in sync with the URL query string. */
export const useFacets = (categorySlug?: string, search?: string) => {
  const [facets, setFacets] = useState<ProductFacets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (categorySlug) qs.set("category", categorySlug);
        if (search) qs.set("search", search);
        const res = await fetch(`/api/products/facets?${qs.toString()}`);
        const json = await res.json();
        if (!cancelled) setFacets(json?.data?.facets ?? null);
      } catch {
        if (!cancelled) setFacets(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [categorySlug, search]);

  return { facets, loading };
};
