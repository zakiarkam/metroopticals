"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Camera,
  Check,
  ClipboardList,
  Clock3,
  Eye,
  Info,
  Loader2,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import PrescriptionForm from "@/features/lenses/components/checkout/PrescriptionForm";
import {
  useLensPicker,
  type PickerStep,
} from "@/features/lenses/hooks/use-lens-picker";
import {
  createPrescription,
  extractPrescription,
} from "@/features/prescriptions/api/prescription-api";
import {
  describePrescription,
  normalisePrescription,
  validatePrescription,
  type FieldErrors,
} from "@/features/lenses/utils/prescription";
import OrderLensNote from "@/features/lenses/components/OrderLensNote";
import type { LensDesignKind, LensQuote } from "@/features/lenses/api/lens-api";
import {
  DESIGN_KIND_HINTS,
  DESIGN_KIND_LABELS,
  LENS_DESIGN_KINDS,
  designNeedsAdd,
} from "@/features/lenses/utils/pricing";
import { formatPrice } from "@/lib/utils/price";
import { siteConfig } from "@/config/site";

export type LensSelection = {
  lensTypeId: number;
  /** How the pair is made - single vision, bifocal, progressive. */
  lensDesignKind: LensDesignKind;
  lensTintId: number | null;
  prescriptionId: number | null;
};

/**
 * The four things a customer is actually deciding, in order.
 *
 * The picker has more internal steps than this - typing a prescription,
 * choosing a saved one and reading one off a photo are three ways through the
 * same decision - so the rail groups them. Someone halfway through should be
 * able to see how much is left and step back to anything they have already
 * answered, which is the difference between a form and a wizard you trust.
 */
const STAGES = [
  { key: "lens", label: "Lens", steps: ["type"] },
  { key: "colour", label: "Colour", steps: ["tint"] },
  {
    key: "prescription",
    label: "Prescription",
    steps: ["method", "manual", "saved", "upload"],
  },
  { key: "review", label: "Review", steps: ["review"] },
] as const;

const STEP_TITLES: Record<PickerStep, string> = {
  type: "Choose your lens",
  tint: "Choose your lens colour",
  method: "Choose how to add your prescription",
  manual: "Enter your prescription",
  saved: "Use a saved prescription",
  upload: "Upload your prescription",
  review: "Check and confirm",
};

export default function LensPickerDialog({
  open,
  onOpenChange,
  frameTitle,
  framePrice,
  initial,
  onConfirm,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameTitle: string;
  /** The frame's own price, so the footer can show the running total. */
  framePrice: number;
  initial?: LensSelection | null;
  onConfirm: (selection: LensSelection) => Promise<boolean>;
  /** Present only when the line already has lenses on it. */
  onRemove?: () => Promise<boolean>;
}) {
  const picker = useLensPicker({ open, initial: initial ?? undefined });
  const {
    step,
    setStep,
    lensType,
    lensTypeId,
    setLensTypeId,
    designKind,
    setDesignKind,
    tint,
    tintId,
    setTintId,
    grouped,
    intentSlug,
    saved,
    setSaved,
    uploadEnabled,
    loading,
    values,
    setValues,
    method,
    setMethod,
    prescriptionId,
    setPrescriptionId,
    ocrFound,
    ocrConfidence,
    ocrIssuedAt,
    ocrFileHash,
    prescribedDesign,
    setPrescribedDesign,
    prescribedFromSlip,
    quoting,
    quoteError,
    clearQuoteError,
    quoteAll,
    quoteFor,
    bestQuoteFor,
    currentQuote,
    applyExtraction,
    chooseSaved,
  } = picker;

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [label, setLabel] = useState("My prescription");
  /**
   * Set when the customer is re-testing a prescription already on file. Their
   * eyes changed; the old powers are what an earlier pair was made to, so the
   * new ones are saved as the next version of the same record rather than
   * over the top of it.
   */
  const [supersedesId, setSupersedesId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The picker hook resets its own selection when the dialog opens; these are
  // the dialog's own scraps of state and have to be cleared alongside it, or
  // a second frame inherits the first one's "save as version 2".
  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setSupersedesId(null);
    setSaveToAccount(true);
    setDesignTouched(false);
    setLabel("My prescription");
  }, [open]);

  // Whether an ADD is needed is a property of the BUILD, not the coating: the
  // same blue cut lens needs one as a progressive and none as single vision.
  const requiresAdd = designNeedsAdd(designKind);
  const hasTints = (lensType?.tints.length ?? 0) > 0;

  /** A reading addition on the prescription means a second distance. */
  const sharedAdd = values.right.add ?? values.left.add ?? null;
  const hasAdd = (sharedAdd ?? 0) > 0;

  /**
   * Which builds this prescription could actually be made as.
   *
   * The build is not a shopping choice, it is part of the prescription - the
   * optician decides it, and the customer usually cannot. So it is resolved
   * from what the prescription says rather than asked as its own step:
   *
   *   - the prescriber named it  -> only builds of that kind
   *   - an ADD but nobody said   -> the multifocal builds, to choose between
   *   - no ADD                   -> single vision
   *
   * Most of the time this leaves exactly one candidate and nothing is asked.
   */
  /**
   * Whether the customer has answered the bifocal-or-progressive question
   * themselves.
   *
   * An addition on the slip says a second distance is needed; it does NOT say
   * how the lens is built, and the two are different glasses at very different
   * prices. So when the prescriber did not name it and the shop makes both,
   * the choice is put to the customer and the basket waits for an answer
   * rather than quietly taking the cheaper one.
   */
  const [designTouched, setDesignTouched] = useState(false);

  /**
   * Which ways this pair could actually be made.
   *
   * How a lens is built is not a shopping choice, it is part of the
   * prescription - the optician decides it, and the customer usually cannot.
   * So it is resolved from what the prescription says rather than asked as a
   * step of its own:
   *
   *   - the prescriber named it  -> that one
   *   - an ADD but nobody said   -> bifocal or progressive, to choose between
   *   - no ADD                   -> single vision
   *
   * Narrowed to what the shop has actually priced, so a coating it only sells
   * as a single vision lens never offers a progressive that quotes "call us".
   */
  const candidateKinds = useMemo<LensDesignKind[]>(() => {
    const priced = lensType?.designKinds?.length
      ? lensType.designKinds
      : LENS_DESIGN_KINDS;

    if (prescribedDesign && priced.includes(prescribedDesign)) {
      return [prescribedDesign];
    }

    if (hasAdd) {
      const multifocal = priced.filter((kind) => kind !== "SINGLE_VISION");
      if (multifocal.length) return multifocal;
    }

    return priced.includes("SINGLE_VISION") ? ["SINGLE_VISION"] : priced;
  }, [lensType, prescribedDesign, hasAdd]);

  /**
   * Keep the chosen way inside what the prescription allows.
   *
   * Editing the prescription - adding an ADD, or correcting bifocal to
   * progressive - has to move it, or the customer would be quoted for a lens
   * their own prescription rules out.
   */
  useEffect(() => {
    if (!candidateKinds.length) return;
    if (candidateKinds.includes(designKind)) return;

    // Several to choose from and nothing chosen yet: the cheapest, so the
    // price shown is the one they can actually get for that money.
    const cheapest = candidateKinds.reduce((best, kind) => {
      const a = lensTypeId ? quoteFor(lensTypeId, kind, null) : null;
      const b = lensTypeId ? quoteFor(lensTypeId, best, null) : null;
      if (!a?.priced) return best;
      if (!b?.priced) return kind;
      return a.total < b.total ? kind : best;
    }, candidateKinds[0]);

    setDesignKind(cheapest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateKinds, designKind, lensTypeId]);

  /**
   * The one question left to ask: an addition, nobody said how to build it,
   * and the shop prices it both ways.
   */
  const mustPickDesign =
    hasAdd &&
    !prescribedDesign &&
    !designTouched &&
    candidateKinds.length > 1 &&
    candidateKinds.every((kind) => kind !== "SINGLE_VISION");

  /** False for plano/fashion lenses, which skip the prescription steps whole. */
  const needsPrescription = lensType?.requiresPrescription !== false;

  const runningTotal =
    framePrice + (currentQuote?.priced ? currentQuote.total : 0);

  /* ------------------------------ navigation ----------------------------- */

  /** The step before this one, given what this lens actually offers. */
  const previousStep = (from: PickerStep): PickerStep | null => {
    if (from === "tint") return "type";
    if (from === "method") return hasTints ? "tint" : "type";
    return null;
  };

  const back = () => {
    clearQuoteError();
    if (step === "review") {
      // A non-prescription lens came here straight from the lens, build or
      // colour step; sending it "back" to a prescription form it never
      // visited would demand powers a plano lens does not have.
      if (!needsPrescription || method === null) {
        return setStep(hasTints ? "tint" : previousStep("tint")!);
      }
      return setStep(method === "saved" ? "saved" : "manual");
    }
    if (step === "manual" || step === "saved" || step === "upload") {
      return setStep("method");
    }
    const previous = previousStep(step);
    if (previous) return setStep(previous);
    onOpenChange(false);
  };

  /**
   * Picking a lens type.
   *
   * If a prescription is already in hand - the shopper is comparing types
   * after entering it once - this jumps straight back to the review with the
   * new price, which is the whole reason the quotes are cached.
   */
  const chooseLensType = (id: number) => {
    setLensTypeId(id);
    setTintId(null);

    const type = picker.lensTypes.find((entry) => entry.id === id);
    if ((type?.tints.length ?? 0) > 0) return setStep("tint");

    const hasRx = prescriptionId !== null || method !== null;
    if (hasRx || type?.requiresPrescription === false) return setStep("review");
    setStep("method");
  };

  const chooseTint = (id: number | null) => {
    setTintId(id);
    const hasRx = prescriptionId !== null || method !== null;
    setStep(hasRx || !lensType?.requiresPrescription ? "review" : "method");
  };

  /* ------------------------------- actions ------------------------------- */

  const submitManual = async () => {
    const found = validatePrescription(values, {
      requiresAdd,
      requiresPower: lensType?.requiresPrescription !== false,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setMethod((current) => current ?? "manual");
    // Typed powers are no longer the saved row they may have started from, so
    // the selection is dropped and the quote is asked for against the values.
    // Leaving the id set would price a prescription that is not on screen.
    setPrescriptionId(null);
    await quoteAll({ prescriptionId: null, values });
    setStep("review");
  };

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const extraction = await extractPrescription(file);

      applyExtraction(extraction);

      if (extraction.warning) {
        // The reader looked and disagrees about what this is - say so
        // plainly rather than presenting an empty form as a partial success.
        toast(extraction.warning, { icon: "🤔", duration: 7000 });
      } else if (extraction.found.length === 0) {
        toast(
          "We couldn't pick the numbers out of that one - please type them in below.",
          { icon: "📝", duration: 6000 },
        );
      } else {
        const n = extraction.found.length;
        toast.success(
          extraction.cached
            ? `We'd read this one before - ${n} ${n === 1 ? "value" : "values"} filled in below. Check each one.`
            : `Read ${n} ${n === 1 ? "value" : "values"} off your prescription. Check each highlighted box before continuing.`,
          { duration: 6000 },
        );
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't read that file. Enter your prescription instead.",
      );
      setMethod("manual");
      setStep("manual");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const confirm = async () => {
    if (!lensTypeId || !currentQuote?.priced) return;

    setSaving(true);
    try {
      let rxId = prescriptionId;

      // Saving is the default and the point: next year this customer picks
      // their prescription off a list instead of typing it again.
      if (!rxId && saveToAccount && lensType?.requiresPrescription) {
        const created = await createPrescription({
          label: label.trim() || "My prescription",
          values: normalisePrescription(values),
          source: method === "upload" ? "UPLOAD" : "MANUAL",
          ocrConfidence,
          issuedAt: ocrIssuedAt,
          prescribedDesign,
          extractionHash: ocrFileHash,
          supersedesId,
        });
        rxId = created.id;
        // On a re-test the superseded chain drops out of the picker - "use my
        // current prescription" has to mean the current one. A brand-new
        // prescription filters nothing: every other saved entry stays.
        setSaved([
          created,
          ...saved.filter((entry) =>
            supersedesId
              ? entry.id !== supersedesId &&
                (entry.rootId ?? entry.id) !== (created.rootId ?? created.id)
              : true,
          ),
        ]);
      }

      // Not saved to the account: the lenses still need powers attached, so
      // they are written as a one-off record rather than left floating.
      if (!rxId && lensType?.requiresPrescription) {
        const created = await createPrescription({
          label: `${frameTitle} - ${new Date().toLocaleDateString("en-GB")}`,
          values: normalisePrescription(values),
          source: method === "upload" ? "UPLOAD" : "MANUAL",
          ocrConfidence,
          issuedAt: ocrIssuedAt,
          prescribedDesign,
          extractionHash: ocrFileHash,
          supersedesId,
        });
        rxId = created.id;
      }

      const ok = await onConfirm({
        lensTypeId,
        lensDesignKind: designKind,
        lensTintId: tintId,
        prescriptionId: rxId,
      });

      if (ok) onOpenChange(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "We couldn't save that. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------- render ------------------------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        aria-describedby="lens-picker-description"
        className="flex h-[92vh] max-h-[92vh] w-[calc(100vw-24px)] max-w-[640px] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:h-[86vh]"
      >
        {/* Radix announces this alongside the title when the dialog opens.
            Without it the console warns and, more to the point, a screen
            reader user hears a step name with no idea what they are inside. */}
        <DialogDescription id="lens-picker-description" className="sr-only">
          Choose prescription lenses for {frameTitle}: pick a lens type, add
          your prescription, and review the price before adding them.
        </DialogDescription>
        {/* --------------------------- header --------------------------- */}
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-3 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={back}
            aria-label="Go back"
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-3 text-dark-4 transition-colors hover:border-blue hover:text-blue"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-[17px] font-bold text-dark">
              {STEP_TITLES[step]}
            </DialogTitle>
            <p className="mt-0.5 truncate text-[12.5px] text-dark-5">
              For {frameTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-dark-4 transition-colors hover:bg-gray-2 hover:text-dark"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <StepRail
          step={step}
          hasTints={hasTints}
          needsPrescription={needsPrescription}
          onJump={(target) => {
            setErrors({});
            clearQuoteError();
            setStep(target);
          }}
          reachable={{
            tint: Boolean(lensTypeId),
            prescription: Boolean(lensTypeId) && needsPrescription,
            review: Boolean(currentQuote),
          }}
        />

        {/* ---------------------------- body ---------------------------- */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-[86px] animate-pulse rounded-xl bg-gray-2"
                />
              ))}
            </div>
          ) : (
            <>
              {step === "type" && (
                <StepLensType
                  grouped={grouped}
                  selectedId={lensTypeId}
                  onSelect={chooseLensType}
                  bestQuoteFor={bestQuoteFor}
                  hasPrescription={prescriptionId !== null || method !== null}
                />
              )}

              {intentSlug &&
                lensType &&
                step !== "type" &&
                step !== "review" && (
                  <p className="mb-4 rounded-xl border border-blue/25 bg-blue/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-dark-3">
                    Set to{" "}
                    <strong className="font-semibold text-dark">
                      {lensType.name}
                    </strong>
                    , the lens you came from. Use Back or the steps above to
                    change it.
                  </p>
                )}

              {step === "tint" && lensType && (
                <StepTint
                  lensType={lensType}
                  selectedId={tintId}
                  onSelect={chooseTint}
                />
              )}

              {step === "method" && (
                <StepMethod
                  savedCount={saved.length}
                  uploadEnabled={uploadEnabled}
                  onPick={(picked) => {
                    setMethod(picked);
                    setSupersedesId(null);
                    setErrors({});
                    if (picked === "saved") return setStep("saved");
                    if (picked === "upload") return setStep("upload");
                    setStep("manual");
                  }}
                />
              )}

              {step === "saved" && (
                <StepSaved
                  saved={saved}
                  selectedId={prescriptionId}
                  onSelect={async (id) => {
                    setSupersedesId(null);
                    chooseSaved(id);
                    // The id is handed over rather than read back from state:
                    // `chooseSaved` has only queued the update, so quoting
                    // off state here would price the previous selection.
                    await quoteAll({ prescriptionId: id });
                    setStep("review");
                  }}
                  onUpdate={(id) => {
                    // A re-test: the old powers open in the form as a starting
                    // point, and saving writes the next version of this same
                    // record rather than a second unrelated prescription.
                    const row = saved.find((entry) => entry.id === id);
                    if (!row) return;
                    setValues(row.values);
                    setLabel(row.label);
                    setSupersedesId(id);
                    setPrescriptionId(null);
                    setMethod("manual");
                    setErrors({});
                    setStep("manual");
                  }}
                  onAddNew={() => {
                    setSupersedesId(null);
                    setMethod("manual");
                    setStep("manual");
                  }}
                />
              )}

              {step === "upload" && (
                <StepUpload
                  uploading={uploading}
                  inputRef={fileInput}
                  onFile={onFile}
                  onSkip={() => {
                    setMethod("manual");
                    setStep("manual");
                  }}
                />
              )}

              {step === "manual" && (
                <PrescriptionForm
                  values={values}
                  onChange={setValues}
                  errors={errors}
                  requiresAdd={requiresAdd}
                  prescribedDesign={prescribedDesign}
                  onPrescribedDesignChange={setPrescribedDesign}
                  prescribedFromSlip={prescribedFromSlip}
                  highlight={ocrFound}
                  confidence={ocrConfidence}
                />
              )}

              {step === "review" && (
                <StepReview
                  needsPrescription={needsPrescription}
                  lensTypeName={lensType?.name ?? ""}
                  designChoices={candidateKinds}
                  designKind={designKind}
                  onDesignChange={(kind: LensDesignKind) => {
                    setDesignTouched(true);
                    setDesignKind(kind);
                  }}
                  mustPickDesign={mustPickDesign}
                  designQuoteFor={(kind: LensDesignKind) =>
                    lensTypeId ? quoteFor(lensTypeId, kind, tintId) : null
                  }
                  prescribedDesign={prescribedDesign}
                  tintName={tint?.name ?? null}
                  tintHex={tint?.hex ?? null}
                  quote={currentQuote}
                  quoting={quoting}
                  quoteError={quoteError}
                  summary={describePrescription(values)}
                  fromSaved={prescriptionId !== null}
                  savedLabel={
                    saved.find((entry) => entry.id === prescriptionId)?.label ??
                    null
                  }
                  savedVersion={
                    saved.find((entry) => entry.id === prescriptionId)
                      ?.version ?? null
                  }
                  saveToAccount={saveToAccount}
                  setSaveToAccount={setSaveToAccount}
                  label={label}
                  setLabel={setLabel}
                  supersedesLabel={
                    supersedesId
                      ? (saved.find((entry) => entry.id === supersedesId)
                          ?.label ?? null)
                      : null
                  }
                  onChangeLens={() => setStep("type")}
                  onEditRx={() => setStep(prescriptionId ? "saved" : "manual")}
                />
              )}
            </>
          )}
        </div>

        {/* --------------------------- footer --------------------------- */}
        <div className="shrink-0 border-t border-gray-3 bg-gray-2 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-dark-5">
                {currentQuote?.priced ? "Frame + lenses" : "Frame"}
              </p>
              <p className="text-[19px] font-bold text-dark">
                {formatPrice(runningTotal)}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {onRemove && initial?.lensTypeId && (
                <button
                  type="button"
                  onClick={async () => {
                    setSaving(true);
                    const ok = await onRemove();
                    setSaving(false);
                    if (ok) onOpenChange(false);
                  }}
                  disabled={saving}
                  className="inline-flex h-11 items-center rounded-xl border border-gray-3 px-4 text-[13px] font-semibold text-dark-4 transition-colors hover:border-red hover:text-red disabled:opacity-50"
                >
                  Remove lenses
                </button>
              )}

              {step === "manual" && (
                <button
                  type="button"
                  onClick={submitManual}
                  disabled={quoting}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
                >
                  {quoting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save &amp; continue
                </button>
              )}

              {step === "review" && (
                <button
                  type="button"
                  onClick={confirm}
                  disabled={
                    saving || quoting || !currentQuote?.priced || mustPickDesign
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {initial?.lensTypeId ? "Update lenses" : "Add lenses"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-dark-5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Every prescription is checked by our optician before the lenses are
            cut.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The progress rail: where you are, what is left, and a way back to anything
 * already answered.
 */
function StepRail({
  step,
  hasTints,
  needsPrescription,
  onJump,
  reachable,
}: {
  step: PickerStep;
  hasTints: boolean;
  needsPrescription: boolean;
  onJump: (step: PickerStep) => void;
  reachable: { tint: boolean; prescription: boolean; review: boolean };
}) {
  // Only the decisions this lens actually asks for. A lens sold in one colour
  // shows two steps rather than four greyed-out ones.
  const stages = STAGES.filter((stage) => {
    if (stage.key === "colour") return hasTints;
    if (stage.key === "prescription") return needsPrescription;
    return true;
  });
  const currentIndex = stages.findIndex((stage) =>
    (stage.steps as readonly string[]).includes(step),
  );

  const canGo = (key: string) =>
    key === "lens" ||
    (key === "colour" && reachable.tint) ||
    (key === "prescription" && reachable.prescription) ||
    (key === "review" && reachable.review);

  return (
    <nav
      aria-label="Progress"
      className="shrink-0 border-b border-gray-3 bg-gray-2"
    >
      <ol className="flex items-center gap-1 overflow-x-auto px-4 py-3 sm:gap-1.5 sm:px-6">
        {stages.map((stage, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const enabled = canGo(stage.key) && !current;

          return (
            <li key={stage.key} className="flex shrink-0 items-center">
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onJump(stage.steps[0] as PickerStep)}
                aria-current={current ? "step" : undefined}
                className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-semibold transition-colors ${
                  current
                    ? "bg-blue text-white"
                    : done
                      ? "text-dark hover:bg-blue/10"
                      : "text-dark-5"
                } ${enabled ? "cursor-pointer" : "cursor-default"}`}
              >
                {/* A digit centred by the grid alone still sits low: the
                    glyph's own line box is taller than the number. `leading-none`
                    plus a fixed square is what actually centres it. */}
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums ${
                    current
                      ? "bg-white text-blue"
                      : done
                        ? "bg-blue text-white"
                        : "bg-gray-4 text-white"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="whitespace-nowrap">{stage.label}</span>
              </button>

              {index < stages.length - 1 && (
                <span
                  aria-hidden
                  className={`mx-1 h-px w-4 shrink-0 sm:w-6 ${
                    done ? "bg-blue/40" : "bg-gray-4/60"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ============================== step: lens ============================== */

function StepLensType({
  grouped,
  selectedId,
  onSelect,
  bestQuoteFor,
  hasPrescription,
}: {
  grouped: [string, import("@/features/lenses/api/lens-api").LensType[]][];
  selectedId: number | null;
  onSelect: (id: number) => void;
  bestQuoteFor: (typeId: number) => any;
  hasPrescription: boolean;
}) {
  if (!grouped.length) {
    return (
      <div className="rounded-xl border border-gray-3 bg-gray-2 px-5 py-8 text-center">
        <Eye className="mx-auto h-7 w-7 text-dark-5" />
        <p className="mt-3 text-[14px] font-semibold text-dark">
          Lenses aren&apos;t priced online yet
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-dark-5">
          Order the frame and we&apos;ll fit your lenses at the shop, or message
          us on WhatsApp for a quote.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/lenses"
        target="_blank"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue underline underline-offset-4 hover:text-blue-dark"
      >
        <Info className="h-4 w-4" />
        Learn about the different lens types
      </Link>

      {grouped.map(([heading, types]) => (
        <div key={heading}>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-dark-4">
            {heading}
          </p>

          <div className="space-y-2.5">
            {types.map((type) => {
              // Once a prescription is in hand the real quoted price is shown
              // instead of the "from" figure. It is the CHEAPEST build, since
              // no build has been chosen yet, and it comes out of the cache so
              // switching between types costs nothing.
              const quote = hasPrescription ? bestQuoteFor(type.id) : null;
              const selected = selectedId === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onSelect(type.id)}
                  aria-pressed={selected}
                  className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
                    selected
                      ? "border-blue bg-blue/[0.08]"
                      : "border-gray-3 bg-gray-2 hover:border-blue/50 hover:bg-gray-1"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-bold text-dark">
                        {type.name}
                      </span>
                      {type.description && (
                        <span className="mt-1 block text-[12.5px] leading-relaxed text-dark-5">
                          {type.description}
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 text-right">
                      {quote ? (
                        quote.priced ? (
                          <span className="text-[15px] font-bold text-dark">
                            {formatPrice(quote.total)}
                          </span>
                        ) : (
                          <span className="text-[11.5px] font-semibold text-orange-dark">
                            Ask us
                          </span>
                        )
                      ) : (
                        <>
                          <span className="block text-[10.5px] font-medium text-dark-5">
                            from
                          </span>
                          <span className="text-[15px] font-bold text-dark">
                            {formatPrice(type.priceFrom)}
                          </span>
                        </>
                      )}
                    </span>
                  </span>

                  {(type.designKinds?.length ?? 0) > 1 && (
                    <span className="mt-2 block text-[11.5px] text-dark-5">
                      {type
                        .designKinds!.map((kind) => DESIGN_KIND_LABELS[kind])
                        .join(" · ")}
                    </span>
                  )}

                  {type.tints.length > 0 && (
                    <span className="mt-2.5 flex items-center gap-1.5">
                      {type.tints.slice(0, 6).map((entry) => (
                        <span
                          key={entry.id}
                          title={entry.name}
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-dark/15"
                          style={{ background: entry.hex ?? "#d1d5db" }}
                        />
                      ))}
                      <span className="text-[11px] font-medium text-dark-5">
                        {type.tints.length} colours
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const PRESCRIBED_LABELS: Record<string, string> = {
  SINGLE_VISION: "single vision",
  BIFOCAL: "bifocals",
  PROGRESSIVE: "progressive lenses",
};

/* ============================== step: tint ============================== */

function StepTint({
  lensType,
  selectedId,
  onSelect,
}: {
  lensType: import("@/features/lenses/api/lens-api").LensType;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className="space-y-2.5">
      <p className="mb-1 text-[13px] leading-relaxed text-dark-5">
        {lensType.name} comes in {lensType.tints.length} colours. The tint is
        what the lens looks like from the outside and how it filters light - the
        prescription is identical in all of them.
      </p>

      {lensType.tints.map((tint) => {
        const selected = selectedId === tint.id;
        return (
          <button
            key={tint.id}
            type="button"
            onClick={() => onSelect(tint.id)}
            aria-pressed={selected}
            className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors ${
              selected
                ? "border-blue bg-blue/[0.08]"
                : "border-gray-3 bg-gray-2 hover:border-blue/50"
            }`}
          >
            <span
              aria-hidden
              className="h-9 w-9 shrink-0 rounded-full ring-1 ring-inset ring-dark/15"
              style={{ background: tint.hex ?? "#d1d5db" }}
            />

            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-dark">
                {tint.name}
              </span>
              {tint.description && (
                <span className="mt-0.5 block text-[12px] leading-relaxed text-dark-5">
                  {tint.description}
                </span>
              )}
            </span>

            <span className="shrink-0 text-[13.5px] font-bold text-dark">
              {tint.surcharge > 0
                ? `+ ${formatPrice(tint.surcharge)}`
                : "Included"}
            </span>

            {selected && <Check className="h-4 w-4 shrink-0 text-blue" />}
          </button>
        );
      })}
    </div>
  );
}

/* ============================= step: method ============================= */

function StepMethod({
  savedCount,
  uploadEnabled,
  onPick,
}: {
  savedCount: number;
  uploadEnabled: boolean;
  onPick: (method: "manual" | "saved" | "upload") => void;
}) {
  const options = [
    {
      key: "manual" as const,
      icon: PencilLine,
      title: "Enter it manually",
      hint: "Type the numbers off your prescription - takes about a minute.",
      show: true,
    },
    {
      key: "saved" as const,
      icon: Clock3,
      title: "Use a saved prescription",
      hint:
        savedCount === 1
          ? "You have 1 prescription saved to your account."
          : `You have ${savedCount} prescriptions saved to your account.`,
      show: savedCount > 0,
    },
    {
      key: "upload" as const,
      icon: Camera,
      title: "Upload a photo",
      hint: "We'll read what we can off it - you check every number after.",
      show: uploadEnabled,
    },
  ].filter((option) => option.show);

  return (
    <div className="space-y-2.5">
      {options.map(({ key, icon: Icon, title, hint }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className="flex w-full items-center gap-3.5 rounded-xl border border-gray-3 bg-gray-2 px-4 py-4 text-left transition-colors hover:border-blue/50 hover:bg-gray-1"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14.5px] font-bold text-dark">
              {title}
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-dark-5">
              {hint}
            </span>
          </span>
        </button>
      ))}

      <div className="pt-3">
        <p className="text-[13px] text-dark-5">
          Don&apos;t have a prescription?
        </p>
        <Link
          href="/contact"
          className="mt-0.5 inline-block text-[13px] font-semibold text-blue underline underline-offset-4 hover:text-blue-dark"
        >
          Book an eye test with us
        </Link>
      </div>
    </div>
  );
}

/* ============================== step: saved ============================= */

function StepSaved({
  saved,
  selectedId,
  onSelect,
  onUpdate,
  onAddNew,
}: {
  saved: import("@/features/prescriptions/api/prescription-api").SavedPrescription[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** "My eyes have changed" - opens this one for a new version. */
  onUpdate: (id: number) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="space-y-2.5">
      {saved.map((entry) => {
        const selected = selectedId === entry.id;
        const expired =
          entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now();

        return (
          <div key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry.id)}
              aria-pressed={selected}
              className={`w-full rounded-xl border px-4 py-3.5 text-left transition-colors ${
                selected
                  ? "border-blue bg-blue/[0.08]"
                  : "border-gray-3 bg-gray-2 hover:border-blue/50"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-bold text-dark">
                  {entry.label}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {entry.prescribedDesign && (
                    <span className="rounded-full bg-blue/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue">
                      {PRESCRIBED_LABELS[entry.prescribedDesign]}
                    </span>
                  )}
                  {entry.version > 1 && (
                    <span className="rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dark-4">
                      v{entry.version}
                    </span>
                  )}
                  {expired && (
                    <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-dark">
                      Out of date
                    </span>
                  )}
                  {selected && <Check className="h-4 w-4 text-blue" />}
                </span>
              </span>

              <span className="mt-1 block font-mono text-[12px] leading-relaxed text-dark-4">
                {entry.summary}
              </span>

              <span className="mt-1 block text-[11px] text-dark-5">
                Saved{" "}
                {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </button>

            {/* Outside the card's own button: a re-test is a different
                intention from "use this one", and nesting buttons is invalid
                markup that swallows the inner click. */}
            <button
              type="button"
              onClick={() => onUpdate(entry.id)}
              className="mt-1.5 inline-flex items-center gap-1.5 pl-4 text-[12px] font-semibold text-blue underline underline-offset-4 hover:text-blue-dark"
            >
              <PencilLine className="h-3.5 w-3.5" />
              My eyes have changed - update these
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddNew}
        className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-4 px-4 py-3.5 text-[13.5px] font-semibold text-dark-4 transition-colors hover:border-blue hover:text-blue"
      >
        <ClipboardList className="h-4 w-4" />
        Enter a different prescription
      </button>
    </div>
  );
}

/* ============================= step: upload ============================= */

function StepUpload({
  uploading,
  inputRef,
  onFile,
  onSkip,
}: {
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onSkip: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-blue bg-blue/[0.06]" : "border-gray-4 bg-gray-2"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue" />
            <p className="mt-3 text-[14px] font-semibold text-dark">
              Reading your prescription…
            </p>
            <p className="mt-1 text-[12.5px] text-dark-5">
              This takes a few seconds.
            </p>
          </>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-dark-4" />
            <p className="mt-3 text-[14.5px] font-bold text-dark">
              Drop a photo of your prescription
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-dark-5">
              We read the powers off it in a few seconds and fill the form in
              for you to check. A clear, straight-on photo of the whole slip
              works best - JPG, PNG, HEIC or PDF, up to 8MB.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-blue-dark"
            >
              <Camera className="h-4 w-4" />
              Choose a file
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>

      <div className="flex gap-2.5 rounded-xl border border-gray-3 bg-gray-2 px-4 py-3.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
        <p className="text-[12px] leading-relaxed text-dark-4">
          The reading is a head start, not the source of truth: every value it
          fills in is highlighted for you to confirm before anything is priced.
          We keep the photo with your prescription so our optician can check it
          against the numbers before your lenses are cut - you can delete it at
          any time from your account.
        </p>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="text-[13px] font-semibold text-blue underline underline-offset-4 hover:text-blue-dark"
      >
        I&apos;d rather type it in
      </button>
    </div>
  );
}

/* ============================= step: review ============================= */

function StepReview({
  needsPrescription,
  lensTypeName,
  designChoices,
  designKind,
  onDesignChange,
  mustPickDesign,
  designQuoteFor,
  prescribedDesign,
  tintName,
  tintHex,
  quote,
  quoting,
  quoteError,
  summary,
  fromSaved,
  savedLabel,
  savedVersion,
  supersedesLabel,
  saveToAccount,
  setSaveToAccount,
  label,
  setLabel,
  onChangeLens,
  onEditRx,
}: {
  /** False for a plano lens - there is no prescription to show or to save. */
  needsPrescription: boolean;
  lensTypeName: string;
  /** The ways this prescription allows. One means nothing to ask. */
  designChoices: LensDesignKind[];
  designKind: LensDesignKind;
  /** True while the bifocal-or-progressive question is still unanswered. */
  mustPickDesign: boolean;
  /** The price of one way of making it, for showing what each choice costs. */
  designQuoteFor: (kind: LensDesignKind) => LensQuote | null;
  onDesignChange: (kind: LensDesignKind) => void;
  prescribedDesign: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  tintName: string | null;
  tintHex: string | null;
  quote: import("@/features/lenses/api/lens-api").LensQuote | null;
  quoting: boolean;
  quoteError: string | null;
  summary: string;
  fromSaved: boolean;
  savedLabel: string | null;
  savedVersion: number | null;
  /** Set when these powers will be saved as the next version of a record. */
  supersedesLabel: string | null;
  saveToAccount: boolean;
  setSaveToAccount: (next: boolean) => void;
  label: string;
  setLabel: (next: string) => void;
  onChangeLens: () => void;
  onEditRx: () => void;
}) {
  const whatsapp = siteConfig.contact.whatsapp
    ? `https://wa.me/${siteConfig.contact.whatsapp.replace(/\D/g, "")}`
    : "/contact";

  return (
    <div className="space-y-4">
      {quoting && (
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-3 bg-gray-2 px-4 py-3.5">
          <Loader2 className="h-4 w-4 animate-spin text-blue" />
          <p className="text-[13px] font-medium text-dark-4">
            Working out the price…
          </p>
        </div>
      )}

      {quoteError && (
        <p className="rounded-xl border border-red/30 bg-red/[0.07] px-4 py-3 text-[12.5px] font-medium text-red">
          {quoteError}
        </p>
      )}

      {/* ------------------------- what you chose ------------------------ */}
      <section className="rounded-xl border border-gray-3 bg-gray-2">
        <header className="flex items-center justify-between gap-3 border-b border-gray-3 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-dark-4">
            Your lenses
          </p>
          <button
            type="button"
            onClick={onChangeLens}
            className="text-[12px] font-semibold text-blue underline underline-offset-4"
          >
            Change
          </button>
        </header>

        <div className="space-y-2.5 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3 text-[13.5px]">
            <span className="text-dark-4">Lens</span>
            <span className="font-semibold text-dark">{lensTypeName}</span>
          </div>

          {/* Settled by the prescription, so it is stated rather than asked -
              unless the shop makes this kind more than one way, which is a
              real choice (a round top and a flat top bifocal are different
              lenses at different prices). */}
          {mustPickDesign ? (
            /* Asked, not assumed. A reading addition says a second distance
               is needed; it does not say whether the lens is built with a
               line or without one, and that is the customer's own answer to
               give. The basket waits for it. */
            <div className="rounded-xl border border-blue/30 bg-white px-3.5 py-3">
              <p className="text-[13px] font-bold text-dark">
                Bifocal or progressive?
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-dark-5">
                Your prescription has a reading addition, and it doesn&apos;t
                say which to make. Both correct the same powers - a bifocal has
                a visible line, a progressive blends between the distances.
              </p>

              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {designChoices.map((kind) => {
                  const kindQuote = designQuoteFor(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => onDesignChange(kind)}
                      className="rounded-lg border border-gray-3 bg-white px-3 py-2.5 text-left transition-colors hover:border-blue hover:bg-blue/[0.05]"
                    >
                      <span className="block text-[12.5px] font-bold text-dark">
                        {DESIGN_KIND_LABELS[kind]}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] font-semibold text-blue">
                        {kindQuote?.priced
                          ? formatPrice(kindQuote.total)
                          : "Ask us for a price"}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-dark-5">
                        {DESIGN_KIND_HINTS[kind]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : designChoices.length <= 1 ? (
            <div className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="text-dark-4">Made as</span>
              <span className="font-semibold text-dark">
                {DESIGN_KIND_LABELS[designKind]}
                {prescribedDesign && (
                  <span className="ml-1.5 text-[11.5px] font-medium text-dark-5">
                    (as prescribed)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="text-[13.5px]">
              <label
                htmlFor="review-design"
                className="mb-1.5 block text-dark-4"
              >
                Made as
                {!prescribedDesign && (
                  <span className="ml-1.5 text-[11.5px] text-dark-5">
                    - your prescription has a reading addition, so pick one
                  </span>
                )}
              </label>
              <select
                id="review-design"
                value={designKind}
                onChange={(event) =>
                  onDesignChange(event.target.value as LensDesignKind)
                }
                className="h-11 w-full cursor-pointer rounded-lg border border-gray-3 bg-white px-3 text-[13.5px] font-semibold text-dark outline-none focus:border-blue"
              >
                {designChoices.map((kind) => (
                  <option key={kind} value={kind}>
                    {DESIGN_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tintName && (
            <div className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="text-dark-4">Colour</span>
              <span className="flex items-center gap-2 font-semibold text-dark">
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-dark/15"
                  style={{ background: tintHex ?? "#d1d5db" }}
                />
                {tintName}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------ your prescription ---------------------- */}
      {needsPrescription && (
        <section className="rounded-xl border border-gray-3 bg-gray-2">
          <header className="flex items-center justify-between gap-3 border-b border-gray-3 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-dark-4">
              Your prescription
              {fromSaved && savedLabel ? ` · ${savedLabel}` : ""}
              {fromSaved && savedVersion && savedVersion > 1
                ? ` (v${savedVersion})`
                : ""}
            </p>
            <button
              type="button"
              onClick={onEditRx}
              className="text-[12px] font-semibold text-blue underline underline-offset-4"
            >
              {fromSaved ? "Use another" : "Edit"}
            </button>
          </header>

          <p className="px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-dark-3">
            {summary}
          </p>
        </section>
      )}

      {!needsPrescription && (
        <p className="rounded-xl border border-gray-3 bg-gray-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-dark-4">
          These are non-prescription lenses - no powers needed, nothing to
          enter. If you do wear a prescription, pick a prescription lens type
          instead.
        </p>
      )}

      {/* ----------------------------- price ---------------------------- */}
      {quote && !quote.priced && (
        <div className="rounded-xl border border-orange/40 bg-orange/[0.08] px-4 py-4">
          <p className="text-[13.5px] font-bold text-orange-dark">
            We can&apos;t price this one online
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-dark-4">
            {quote.reason}
          </p>
          <Link
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-10 items-center rounded-xl bg-blue px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-blue-dark"
          >
            Message us for a quote
          </Link>
        </div>
      )}

      {quote?.priced && (
        <section className="rounded-xl border border-blue/25 bg-blue/[0.06] px-4 py-4">
          <div className="space-y-2 text-[13.5px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-dark-4">
                Lenses{quote.bandLabel ? ` · ${quote.bandLabel}` : ""}
              </span>
              <span className="font-semibold text-dark">
                {formatPrice(quote.lensPrice)}
              </span>
            </div>

            {quote.tintSurcharge > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-dark-4">Colour</span>
                <span className="font-semibold text-dark">
                  {formatPrice(quote.tintSurcharge)}
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between gap-3 border-t border-blue/20 pt-2.5">
              <span className="text-[14px] font-bold text-dark">
                Lenses total
              </span>
              <span className="text-[17px] font-bold text-blue">
                {formatPrice(quote.total)}
              </span>
            </div>
          </div>

          <OrderLensNote
            isOrderLens={quote.isOrderLens}
            leadTimeDays={quote.leadTimeDays}
            variant="panel"
            className="mt-3"
          />

          <p className="mt-2.5 text-[11px] leading-relaxed text-dark-5">
            Priced per pair, from the stronger of your two eyes.
          </p>
        </section>
      )}

      {supersedesLabel && (
        <p className="rounded-xl border border-blue/25 bg-blue/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-dark-3">
          These will be saved as a new version of{" "}
          <strong className="font-semibold text-dark">{supersedesLabel}</strong>
          . Your previous powers stay on file, so the pair you bought with them
          can still be matched.
        </p>
      )}

      {/* -------------------------- save for next ------------------------ */}
      {needsPrescription && !fromSaved && quote?.priced && (
        <section className="rounded-xl border border-gray-3 bg-gray-2 px-4 py-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={saveToAccount}
              onChange={(event) => setSaveToAccount(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-blue-light"
            />
            <span>
              <span className="block text-[13.5px] font-semibold text-dark">
                Save this to my account
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-dark-5">
                Next time - a new pair, or a spare in a year - you pick it off a
                list instead of typing it again. When your eyes change we save
                the new powers as a new version and keep the old one.
              </span>
            </span>
          </label>

          {saveToAccount && (
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={60}
              placeholder="Name it - “Mine”, “Amma’s”, “Driving pair”"
              className="mt-3 h-11 w-full rounded-xl border border-gray-3 bg-white px-4 text-[13.5px] text-dark outline-none placeholder:text-dark-5 focus:border-blue"
            />
          )}
        </section>
      )}
    </div>
  );
}
