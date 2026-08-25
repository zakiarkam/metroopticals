/**
 * Turning a colourway name into something you can see.
 *
 * Colours are typed free-hand by the admin ("Tortoise", "Matte Black",
 * "Rose Gold"), so there is no colour code to read  the swatch is derived from
 * the words instead. Matching is done on whole words against a table of the
 * finishes eyewear is actually sold in, longest phrase first so "Rose Gold"
 * wins over "Gold" and "Matte Black" over "Black".
 *
 * A name nothing matches gets no swatch at all rather than a guessed one: a
 * wrong colour dot is worse than a plain text chip, because the shopper
 * believes it.
 */

export type ColorSwatch = {
  /** CSS background for the dot  flat, or a gradient for two-tone finishes. */
  background: string;
  /** Set on very light finishes so the dot keeps a visible edge. */
  needsBorder: boolean;
};

const SWATCHES: { match: string; background: string; light?: boolean }[] = [
  // Two-tone and patterned finishes come first: they are the most specific.
  {
    match: "tortoise",
    background:
      "linear-gradient(135deg, #8b5a2b 0%, #d9a566 38%, #4a2c12 70%, #a9743f 100%)",
  },
  {
    match: "havana",
    background:
      "linear-gradient(135deg, #7a4419 0%, #c68642 45%, #40220c 100%)",
  },
  {
    match: "demi",
    background:
      "linear-gradient(135deg, #8b5a2b 0%, #d9a566 50%, #4a2c12 100%)",
  },
  {
    match: "gradient",
    background: "linear-gradient(180deg, #4b4b4b 0%, #d7d7d7 100%)",
  },
  { match: "rose gold", background: "#b76e79" },
  { match: "gun metal", background: "#5c6068" },
  { match: "gunmetal", background: "#5c6068" },
  { match: "matte black", background: "#211f1e" },
  { match: "matt black", background: "#211f1e" },
  { match: "jet black", background: "#0b0b0b" },
  { match: "crystal", background: "#e4ecf1", light: true },
  { match: "transparent", background: "#e9edf0", light: true },
  { match: "clear", background: "#e9edf0", light: true },
  { match: "champagne", background: "#e6d3a3", light: true },
  { match: "burgundy", background: "#6d1f2e" },
  { match: "maroon", background: "#6d1f2e" },
  { match: "olive", background: "#6b6b3a" },
  { match: "khaki", background: "#a89468" },
  { match: "navy", background: "#1c2a4a" },
  { match: "teal", background: "#1f6f6b" },
  { match: "beige", background: "#ddccb0", light: true },
  { match: "nude", background: "#e0c3ad", light: true },
  { match: "ivory", background: "#f2ece0", light: true },
  { match: "cream", background: "#f4ead8", light: true },
  { match: "amber", background: "#c47f1c" },
  { match: "honey", background: "#c99a3f" },
  { match: "bronze", background: "#8c6239" },
  { match: "copper", background: "#b06a35" },
  { match: "silver", background: "#c6cbd0", light: true },
  { match: "gold", background: "#c8a349" },
  { match: "black", background: "#141414" },
  { match: "white", background: "#f7f7f5", light: true },
  { match: "grey", background: "#8b8f94" },
  { match: "gray", background: "#8b8f94" },
  { match: "brown", background: "#6b4423" },
  { match: "blue", background: "#2559a8" },
  { match: "green", background: "#2f7a44" },
  { match: "red", background: "#b32424" },
  { match: "pink", background: "#e08aa4" },
  { match: "purple", background: "#6a3f9e" },
  { match: "violet", background: "#7a4fb5" },
  { match: "yellow", background: "#e0bb2e", light: true },
  { match: "orange", background: "#d4711f" },
];

// Longest phrase first so a two-word finish is never shadowed by one of its
// own words. Sorted once at module load rather than on every lookup.
const ORDERED = [...SWATCHES].sort((a, b) => b.match.length - a.match.length);

export const getColorSwatch = (name: string): ColorSwatch | null => {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;

  const entry = ORDERED.find((candidate) =>
    normalized.includes(candidate.match),
  );
  if (!entry) return null;

  return { background: entry.background, needsBorder: Boolean(entry.light) };
};

/** Trimmed, de-duplicated colour names  the admin field is free text. */
export const normalizeColorOptions = (
  values?: (string | null)[] | null,
): string[] => {
  if (!values?.length) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
};
