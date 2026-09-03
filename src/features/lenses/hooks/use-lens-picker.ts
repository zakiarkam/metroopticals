"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getLensCatalogue,
  quoteLensTypes,
  type LensQuote,
  type LensType,
} from "@/features/lenses/api/lens-api";
import {
  getPrescriptions,
  type SavedPrescription,
} from "@/features/prescriptions/api/prescription-api";
import {
  EMPTY_PRESCRIPTION,
  normalisePrescription,
  type PrescriptionValues,
} from "@/features/lenses/utils/prescription";
import {
  clearLensIntent,
  getLensIntent,
} from "@/features/lenses/utils/lens-intent";

export type PickerStep =
  | "type"
  | "tint"
  | "method"
  | "manual"
  | "saved"
  | "upload"
  | "review";

export type PrescriptionMethod = "manual" | "saved" | "upload";

/**
 * The catalogue is the same for everybody and changes about as often as the
 * price list does, so it is fetched once per page load and shared. Opening
 * the picker on a second cart line is instant.
 */
let catalogueCache: {
  lensTypes: LensType[];
  uploadEnabled: boolean;
} | null = null;
let cataloguePromise: Promise<typeof catalogueCache> | null = null;

async function loadCatalogue() {
  if (catalogueCache) return catalogueCache;
  if (!cataloguePromise) {
    cataloguePromise = getLensCatalogue()
      .then((result) => {
        catalogueCache = result;
        return result;
      })
      .finally(() => {
        cataloguePromise = null;
      });
  }
  return cataloguePromise;
}

/** Drop the shared catalogue after the admin edits it. */
export function invalidateLensCatalogue() {
  catalogueCache = null;
}

/**
 * One prescription, reduced to a string.
 *
 * Two prescriptions with the same powers price the same, so this is what the
 * quote cache is keyed on — which is how flipping between five lens types
 * after entering a prescription costs one request rather than five.
 */
function fingerprint(
  prescriptionId: number | null,
  values: PrescriptionValues | null,
): string {
  if (prescriptionId) return `saved:${prescriptionId}`;
  if (!values) return "none";
  const n = normalisePrescription(values);
  return JSON.stringify([
    n.right.sph, n.right.cyl, n.right.axis, n.right.add, n.right.prism, n.right.base,
    n.left.sph, n.left.cyl, n.left.axis, n.left.add, n.left.prism, n.left.base,
    n.pdSingle, n.pdRight, n.pdLeft,
  ]);
}

export type LensPickerState = ReturnType<typeof useLensPicker>;

export function useLensPicker({
  open,
  initial,
}: {
  open: boolean;
  initial?: {
    lensTypeId?: number | null;
    lensDesignId?: number | null;
    lensTintId?: number | null;
    prescriptionId?: number | null;
  };
}) {
  const [lensTypes, setLensTypes] = useState<LensType[]>([]);
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [saved, setSaved] = useState<SavedPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<PickerStep>("type");
  const [lensTypeId, setLensTypeId] = useState<number | null>(null);
  const [designId, setDesignId] = useState<number | null>(null);
  const [tintId, setTintId] = useState<number | null>(null);
  const [method, setMethod] = useState<PrescriptionMethod | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [values, setValues] = useState<PrescriptionValues>(EMPTY_PRESCRIPTION);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrFound, setOcrFound] = useState<string[]>([]);
  /** The date on the uploaded slip, kept so the saved prescription carries it. */
  const [ocrIssuedAt, setOcrIssuedAt] = useState<string | null>(null);
  /** Identifies the stored slip, so the saved prescription can point at it. */
  const [ocrFileHash, setOcrFileHash] = useState<string | null>(null);
  /**
   * What the prescriber said to make. Null means nobody has said — a real
   * answer, not a missing one, since plenty of customers do not know.
   */
  const [prescribedDesign, setPrescribedDesign] = useState<
    "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null
  >(null);
  /** True when it was read off the slip rather than chosen by the customer. */
  const [prescribedFromSlip, setPrescribedFromSlip] = useState(false);

  /**
   * Every quote we have already been given, keyed by prescription and lens
   * type. Nothing in here is ever asked for twice — that is the point of it.
   */
  const quoteCache = useRef(new Map<string, LensQuote>());
  const [, forceRender] = useState(0);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  /* ------------------------------ loading ------------------------------ */

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      // Either fetch failing degrades to an empty list rather than an
      // unhandled rejection: the picker then says lenses are not priced
      // online, which is at least true from where the shopper is standing.
      loadCatalogue().catch(() => null),
      getPrescriptions().catch(() => []),
    ])
      .then(([catalogue, prescriptions]) => {
        if (cancelled) return;
        setLensTypes(catalogue?.lensTypes ?? []);
        setUploadEnabled(Boolean(catalogue?.uploadEnabled));
        setSaved(prescriptions);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Re-opening the picker on a line that already has lenses starts from what
  // is on it, so "change my lenses" is an edit rather than a fresh start.
  useEffect(() => {
    if (!open) return;
    setStep("type");
    setLensTypeId(initial?.lensTypeId ?? null);
    setDesignId(initial?.lensDesignId ?? null);
    setTintId(initial?.lensTintId ?? null);
    setPrescriptionId(initial?.prescriptionId ?? null);
    setMethod(initial?.prescriptionId ? "saved" : null);
    setValues(EMPTY_PRESCRIPTION);
    setOcrConfidence(null);
    setOcrFound([]);
    setOcrIssuedAt(null);
    setOcrFileHash(null);
    // Reset with the rest, or a second frame inherits the first one's
    // prescribed type and quietly prices a build nobody asked for.
    setPrescribedDesign(null);
    setPrescribedFromSlip(false);
    setQuoteError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    initial?.lensTypeId,
    initial?.lensDesignId,
    initial?.lensTintId,
    initial?.prescriptionId,
  ]);

  /**
   * The lens they came for.
   *
   * Someone who clicked "choose a frame for this lens" on the Blue Cut guide
   * has already made the first decision; making them find Blue Cut again in a
   * list of nine would be asking the same question twice. So the picker opens
   * on the next step instead — and the Back button is right there, because it
   * is a preselection, not a commitment.
   */
  const [intentSlug, setIntentSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loading || !lensTypes.length) return;
    // An existing choice on the line always wins over an old browsing intent.
    if (initial?.lensTypeId) return;

    const slug = getLensIntent();
    if (!slug) return;

    const match = lensTypes.find((type) => type.slug === slug);
    if (!match) return;

    setIntentSlug(slug);
    setLensTypeId(match.id);
    setStep(match.tints.length > 0 ? "tint" : "method");
    // Honoured once. Coming back to the picker afterwards should start where
    // the customer left it, not where they were an hour ago.
    clearLensIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, lensTypes, initial?.lensTypeId]);

  // A saved prescription chosen from the list supplies the values too, so the
  // manual form can be opened on it and the review step can print it.
  useEffect(() => {
    if (!prescriptionId) return;
    const row = saved.find((entry) => entry.id === prescriptionId);
    if (!row) return;
    setValues(row.values);
    // A saved prescription remembers what it was prescribed as, so a returning
    // customer is not asked the one question they could not answer last time.
    setPrescribedDesign(row.prescribedDesign ?? null);
    setPrescribedFromSlip(false);
  }, [prescriptionId, saved]);

  /* ------------------------------ quoting ------------------------------ */

  const hasPrescription = prescriptionId !== null || method !== null;

  // Keyed on the powers alone, never on which step we happen to be on. Tying
  // it to `method` looked equivalent and was not: `method` is set in the same
  // event as the quote is asked for, so the write landed under one key and
  // the read came back under another and the review step showed no price.
  const rxKey = fingerprint(prescriptionId, values);

  const cacheKey = (
    key: string,
    typeId: number,
    design: number | null,
    tint: number | null,
  ) => `${key}|${typeId}|${design ?? 0}|${tint ?? 0}`;

  /**
   * Price every lens type against the prescription we now have.
   *
   * Called once, when the customer finishes entering their prescription.
   * After that, changing lens type is a map lookup — no request, and above
   * all no second call to the paid reader, which is what the customer would
   * otherwise pay for out of their own patience.
   *
   * The prescription can be passed in explicitly. React state set earlier in
   * the same handler is not visible here yet, so "choose this saved
   * prescription, then price it" has to hand the id over rather than rely on
   * a `setState` that has not been applied.
   */
  const quoteAll = useCallback(
    async (override?: {
      prescriptionId?: number | null;
      values?: PrescriptionValues;
    }) => {
      if (!lensTypes.length) return;

      // `??` is wrong here and was a real bug: passing `{ prescriptionId:
      // null }` means "forget the saved prescription, price the values on
      // screen", but `null ?? prescriptionId` falls through to the state and
      // re-priced the OLD saved powers. Editing a saved prescription then
      // showed the price of what it used to say. The key is whether the
      // caller SUPPLIED the field, not whether the value is truthy.
      const rxId =
        override && "prescriptionId" in override
          ? (override.prescriptionId ?? null)
          : prescriptionId;
      const rxValues = override?.values ?? values;
      const key = fingerprint(rxId, rxValues);

      const missing = lensTypes.filter(
        (type) =>
          !type.designs.every((design) =>
            quoteCache.current.has(cacheKey(key, type.id, design.id, null)),
          ),
      );
      if (!missing.length) return;

      setQuoting(true);
      setQuoteError(null);
      try {
        const quotes = await quoteLensTypes({
          lensTypeIds: missing.map((type) => type.id),
          ...(rxId
            ? { prescriptionId: rxId }
            : { prescription: normalisePrescription(rxValues) }),
        });

        // One request comes back with the whole grid: every build of every
        // lens, crossed with every colour. Moving around the picker after
        // this is a map lookup, not another round trip.
        for (const entry of quotes) {
          for (const design of entry.designs ?? []) {
            const base = { ...entry, ...design } as LensQuote;
            quoteCache.current.set(
              cacheKey(key, entry.lensTypeId, design.designId, null),
              base,
            );

            for (const tint of entry.tints ?? []) {
              quoteCache.current.set(
                cacheKey(key, entry.lensTypeId, design.designId, tint.id),
                {
                  ...base,
                  tintSurcharge: tint.surcharge,
                  total: base.priced ? round(base.lensPrice + tint.surcharge) : 0,
                },
              );
            }
          }
        }

        forceRender((tick) => tick + 1);
      } catch (error: any) {
        setQuoteError(
          error?.response?.data?.message ||
            "We couldn't price that just now. Try again in a moment.",
        );
      } finally {
        setQuoting(false);
      }
    },
    [lensTypes, prescriptionId, values],
  );

  /** The quote for one lens type and tint, from the cache. */
  const quoteFor = useCallback(
    (
      typeId: number,
      design: number | null = null,
      tint: number | null = null,
    ): LensQuote | null =>
      quoteCache.current.get(cacheKey(rxKey, typeId, design, tint)) ?? null,
    [rxKey],
  );

  /**
   * The cheapest priced build of a lens, for the lens list.
   *
   * A customer scanning coatings wants "what does this lens cost me?", and the
   * honest answer before they have chosen a build is its cheapest one.
   */
  const bestQuoteFor = useCallback(
    (typeId: number): LensQuote | null => {
      const type = lensTypes.find((entry) => entry.id === typeId);
      if (!type) return null;

      const quotes = type.designs
        .map((design) => quoteFor(typeId, design.id, null))
        .filter((quote): quote is LensQuote => Boolean(quote));

      const priced = quotes.filter((quote) => quote.priced);
      if (priced.length) {
        return priced.reduce((cheapest, quote) =>
          quote.total < cheapest.total ? quote : cheapest,
        );
      }
      return quotes[0] ?? null;
    },
    [lensTypes, quoteFor],
  );

  /**
   * Quote on arrival, not only on submission.
   *
   * Two flows reach a price-showing step without ever pressing "Save &
   * continue": a non-prescription lens goes straight to the review, and
   * editing a line whose prescription is already saved jumps there from the
   * lens list. Both used to stall on "working out the price" forever, because
   * the only call to `quoteAll` lived in the manual form's submit.
   *
   * Never fired from the manual step — there the values change with every
   * keystroke, and quoting each one would be a request per click for prices
   * nobody is looking at yet.
   */
  useEffect(() => {
    // A failed quote must not retry itself: quoting toggling back to false
    // would re-run this effect and hammer the API in a loop. The error stays
    // on screen instead, and moving to another step clears it and tries anew.
    if (!open || loading || !lensTypes.length || quoting || quoteError) return;
    const settled =
      step === "review" ||
      ((step === "type" || step === "tint") && prescriptionId !== null);
    if (!settled) return;
    if (lensTypeId && quoteFor(lensTypeId, designId, tintId)) return;
    void quoteAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, lensTypes.length, step, prescriptionId, lensTypeId, designId, tintId, quoting, quoteError, quoteFor]);

  /* ------------------------------ derived ------------------------------ */

  const lensType = useMemo(
    () => lensTypes.find((type) => type.id === lensTypeId) ?? null,
    [lensTypes, lensTypeId],
  );

  const design = useMemo(
    () => lensType?.designs.find((entry) => entry.id === designId) ?? null,
    [lensType, designId],
  );

  const tint = useMemo(
    () => lensType?.tints.find((entry) => entry.id === tintId) ?? null,
    [lensType, tintId],
  );

  const currentQuote = lensTypeId ? quoteFor(lensTypeId, designId, tintId) : null;

  /** Lens types grouped under their headings, the way the picker shows them. */
  const grouped = useMemo(() => {
    const groups = new Map<string, LensType[]>();
    for (const type of lensTypes) {
      const key = type.groupLabel?.trim() || "Lenses";
      groups.set(key, [...(groups.get(key) ?? []), type]);
    }
    return [...groups.entries()];
  }, [lensTypes]);

  /** Applying a read from a photo: the values, and which of them it found. */
  const applyExtraction = useCallback(
    (extraction: {
      values: PrescriptionValues;
      found: string[];
      confidence: number | null;
      issuedAt?: string | null;
      fileHash?: string;
      stored?: boolean;
      prescribedDesign?: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
    }) => {
      setValues(extraction.values);
      setOcrFound(extraction.found);
      setOcrConfidence(extraction.confidence);
      setOcrIssuedAt(extraction.issuedAt ?? null);
      // Only when the slip actually reached storage — pointing a saved
      // prescription at a file that is not there would show the shop a
      // broken image and imply we lost it.
      setOcrFileHash(extraction.stored ? (extraction.fileHash ?? null) : null);
      setPrescribedDesign(extraction.prescribedDesign ?? null);
      setPrescribedFromSlip(Boolean(extraction.prescribedDesign));
      setPrescriptionId(null);
      setMethod("upload");
      setStep("manual");
    },
    [],
  );

  const chooseSaved = useCallback(
    (id: number) => {
      setPrescriptionId(id);
      setMethod("saved");
      setOcrFound([]);
      setOcrConfidence(null);
      setOcrIssuedAt(null);
      setOcrFileHash(null);
      setQuoteError(null);

      const row = saved.find((entry) => entry.id === id);
      if (row) setValues(row.values);
    },
    [saved],
  );

  return {
    // data
    lensTypes,
    grouped,
    intentSlug,
    saved,
    setSaved,
    uploadEnabled,
    loading,

    // selection
    step,
    setStep,
    lensTypeId,
    setLensTypeId,
    lensType,
    designId,
    setDesignId,
    design,
    tintId,
    setTintId,
    tint,
    method,
    setMethod,
    prescriptionId,
    setPrescriptionId,
    values,
    setValues,
    ocrConfidence,
    ocrFound,
    ocrIssuedAt,
    ocrFileHash,
    prescribedDesign,
    setPrescribedDesign,
    prescribedFromSlip,

    // pricing
    quoting,
    quoteError,
    /** Clears a failed quote so navigating tries again. */
    clearQuoteError: () => setQuoteError(null),
    quoteAll,
    quoteFor,
    bestQuoteFor,
    currentQuote,

    // actions
    applyExtraction,
    chooseSaved,
  };
}

const round = (value: number) => Math.round(value * 100) / 100;
