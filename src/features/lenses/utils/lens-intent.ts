"use client";

/**
 * "I want this lens" - carried from a guide page to the frame the customer
 * eventually picks.
 *
 * A lens cannot be bought on its own, so the guide's call to action sends
 * people to the frames with the lens named in the URL. That intention has to
 * survive browsing the shop, opening a product, adding it to the basket and
 * finally opening the lens picker - several page loads later. So it is parked
 * in `sessionStorage`: it belongs to this visit, it is not worth a database
 * row, and it must not outlive the tab.
 *
 * It is only ever a preselection. Nothing is priced or bought from it, and
 * every step of the picker can still be changed.
 */

const KEY = "metro_lens_intent";

/** How long an intention is worth honouring. After this it is stale browsing. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

type Intent = { slug: string; at: number };

export function setLensIntent(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const value: Intent = { slug, at: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Private browsing, or storage disabled. The picker simply opens on the
    // lens list instead, which is where it opened before any of this existed.
  }
}

export function getLensIntent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Intent;
    if (!value?.slug || typeof value.at !== "number") return null;
    if (Date.now() - value.at > MAX_AGE_MS) {
      clearLensIntent();
      return null;
    }
    return value.slug;
  } catch {
    return null;
  }
}

export function clearLensIntent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
