"use client";

import { useEffect, useState } from "react";

export type BrandOption = {
  id: number;
  name: string;
  slug: string;
  status: string;
  productCount?: number;
};

/** Loads the brand list for admin selects and the brands management tab. */
export function useBrands({ includeInactive = false } = {}) {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const qs = includeInactive ? "?includeInactive=true" : "";
        const res = await fetch(`/api/brands${qs}`);
        const json = await res.json();
        if (cancelled) return;
        setBrands(json?.data?.brands ?? []);
        setError(null);
      } catch {
        if (!cancelled) setError("Failed to load brands");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [includeInactive, reloadKey]);

  return { brands, loading, error, refresh: () => setReloadKey((k) => k + 1) };
}
