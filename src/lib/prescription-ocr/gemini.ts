/**
 * Gemini 2.5 Flash, reading a spectacle prescription off a photo or PDF.
 *
 *   POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent
 *   x-goog-api-key: <GEMINI_API_KEY>
 *
 * A vision model changes what "reading" means here. The previous reader was
 * built for medicine prescriptions and had no field for a sphere or a PD; a
 * general vision model can be told it is an optical dispenser and asked for
 * exactly our fields, as JSON, against a response schema the API enforces.
 * So the primary path is structured output, not regex over stray text.
 *
 * What does NOT change is the trust boundary. A model can misread a 6 for an
 * 8 or invent a value to satisfy the schema, so every number it returns goes
 * through the same range-and-quarter-step guards a typed value would, and the
 * customer confirms the lot on the form before anything is priced or saved.
 *
 * Cost, deliberately: thinking is switched off (a transcription task gains
 * nothing from it and pays per token for it), temperature is 0, output is
 * capped, and the caller caches by file hash so no file is ever read twice.
 */

import {
  ADD_MAX,
  ADD_MIN,
  AXIS_MAX,
  AXIS_MIN,
  CYL_MAX,
  CYL_MIN,
  PD_MAX,
  PD_MIN,
  PD_MONO_MAX,
  PD_MONO_MIN,
  PRISM_BASES,
  PRISM_MAX,
  SPH_MAX,
  SPH_MIN,
  roundToStep,
} from "@/features/lenses/constants/optics";
import type {
  EyeValues,
  PrescriptionValues,
} from "@/features/lenses/utils/prescription";
import { EMPTY_PRESCRIPTION } from "@/features/lenses/utils/prescription";
import type { OcrExtraction } from "@/lib/prescription-ocr";
import { logger } from "@/lib/logger";

/**
 * The model, and what to fall back to when Google retires it.
 *
 * This is not hypothetical caution: `gemini-2.5-flash` began answering
 * "no longer available to new users" with a 404, and every upload broke until
 * the model name was changed. Pinning gives predictable behaviour and cost;
 * the fallback means the next retirement degrades to "still works, with a
 * warning in the log" instead of a dead feature nobody notices.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";
/** A rolling alias - never 404s on retirement, so it is the safety net. */
const FALLBACK_MODEL = "gemini-flash-latest";

const TIMEOUT_MS = 45_000;

/**
 * Reasoning costs money and this is a transcription job.
 *
 * Measured on a real prescription slip: "minimal" spends ZERO thinking tokens
 * and reads it exactly as well as the levels above it. It also protects the
 * answer - thinking shares the output budget on these models, and at "medium"
 * the reply was cut off mid-JSON with finishReason MAX_TOKENS.
 *
 * The older `thinkingBudget: 0` is rejected outright by the 3.x models (HTTP
 * 400), which is why the request retries without the block if it is refused.
 */
const THINKING_LEVEL = "minimal";

/**
 * Generous on purpose. The reply is ~200 tokens, but on some models the
 * thinking tokens come out of this same budget, and running out truncates the
 * JSON rather than failing loudly.
 */
const MAX_OUTPUT_TOKENS = 2048;

const apiKey = () =>
  process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

export const isGeminiConfigured = () => Boolean(apiKey());

/* ------------------------------ the request ----------------------------- */

const PROMPT = `You are an optical dispensing assistant transcribing a spectacle (eyeglass) prescription.

Read the attached document and transcribe the prescription values EXACTLY as written. Rules:

- OD / R / RE / "Right" is the right eye. OS / L / LE / "Left" is the left eye. OU / BE means both eyes - put the same values on each.
- SPH (sphere), CYL (cylinder) and ADD are in dioptres, normally in 0.25 steps, and signed. Keep the sign exactly as written - do NOT transpose between plus-cylinder and minus-cylinder form, and do NOT "tidy" a value onto a rounder number.
- "Plano", "Pl", "PL", "∞" or "0" as a sphere means 0. "DS", "Sph" or a blank cylinder column means there is no cylinder: return null for cyl and axis.
- "NIL", "-", "N/A" or a struck-through cell means nothing was prescribed for that eye: return null, not 0.
- AXIS is a whole number from 1 to 180. It only exists alongside a cylinder. "x 90", "@90" and "Ax 090" are all axis 90.
- ADD (reading addition, also written NV, Near, Near Add, Reading, Add) is POSITIVE and often written once for both eyes - if so, put it on both.
- If the slip gives DISTANCE (DV) and NEAR (NV) powers in separate rows instead of an ADD, return the DISTANCE powers as sph/cyl/axis, and set add to the difference (near sphere minus distance sphere) for that eye. Only do this when both rows are for the same eye and the difference is positive.
- PD (pupillary distance) in millimetres: one binocular figure (roughly 54–74) goes in pdBinocular; two monocular halves (roughly 25–36 each, often written 31/32) go in pdRight and pdLeft. If both a distance PD and a near PD are given, use the distance PD.
- Prism, if present, is in prism dioptres with a base direction (UP, DOWN, IN or OUT). "BU", "BD", "BI", "BO" are those four.
- If a value is not on the document, return null for it. NEVER guess or fill in a typical value. A value you cannot read confidently is null, not your best guess.
- issuedDate is the date on the prescription in YYYY-MM-DD form, or null. A date written D/M/Y is day first.
- confidence is your honest 0–1 estimate of how reliably you could read the powers. Handwriting you had to interpret, a blurred or cropped photo, or a column you were unsure of should all pull it down.
- prescribedDesign: what the prescriber said to MAKE, if they wrote it anywhere on the slip. Return exactly one of "SINGLE_VISION", "BIFOCAL" or "PROGRESSIVE", or null.
  - BIFOCAL: "Bifocal", "Bifocals", "BF", "B/F", "Kryptok", "D-Top", "D-Seg", "Flat Top", "FT28", "Round Top", "Executive".
  - PROGRESSIVE: "Progressive", "PAL", "Varifocal", "Varilux", "Freeform", "Free Form", "Vision Max", "Progressive Addition".
  - SINGLE_VISION: "Single Vision", "SV", "Distance only", "Reading only", "Near only".
  - Return null if the slip does not say. A reading addition on its own is NOT enough to decide - an ADD can mean a bifocal, a progressive, or a separate pair of reading glasses. NEVER infer this from the powers.
- isContactLensPrescription is true only for a CONTACT LENS prescription - one with a base curve (BC), diameter (DIA), or a named lens/material. Those powers are measured at the eye and are not the same numbers as a pair of glasses, so they must never be used to cut spectacle lenses.
- If the document is not a spectacle prescription at all (a medicine prescription, a receipt, an unrelated photo), set isSpectaclePrescription to false and every value to null.`;

/** One eye, in the schema dialect the Gemini API enforces server-side. */
const EYE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sph: { type: "NUMBER", nullable: true },
    cyl: { type: "NUMBER", nullable: true },
    axis: { type: "INTEGER", nullable: true },
    add: { type: "NUMBER", nullable: true },
    prism: { type: "NUMBER", nullable: true },
    prismBase: { type: "STRING", nullable: true },
  },
  required: ["sph", "cyl", "axis", "add", "prism", "prismBase"],
} as const;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    isSpectaclePrescription: { type: "BOOLEAN" },
    isContactLensPrescription: { type: "BOOLEAN" },
    confidence: { type: "NUMBER" },
    issuedDate: { type: "STRING", nullable: true },
    prescribedDesign: {
      type: "STRING",
      nullable: true,
      enum: ["SINGLE_VISION", "BIFOCAL", "PROGRESSIVE"],
    },
    right: EYE_SCHEMA,
    left: EYE_SCHEMA,
    pdBinocular: { type: "NUMBER", nullable: true },
    pdRight: { type: "NUMBER", nullable: true },
    pdLeft: { type: "NUMBER", nullable: true },
  },
  required: [
    "isSpectaclePrescription",
    "isContactLensPrescription",
    "confidence",
    "issuedDate",
    "prescribedDesign",
    "right",
    "left",
    "pdBinocular",
    "pdRight",
    "pdLeft",
  ],
} as const;

export async function extractWithGemini({
  bytes,
  contentType,
}: {
  bytes: Buffer;
  fileName: string;
  contentType: string;
}): Promise<OcrExtraction> {
  const key = apiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const endpoint =
    process.env.GEMINI_API_URL?.trim() ||
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const buildBody = (withThinking: boolean) => ({
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: contentType,
              data: bytes.toString("base64"),
            },
          },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      ...(withThinking
        ? { thinkingConfig: { thinkingLevel: THINKING_LEVEL } }
        : {}),
    },
  });

  const post = async (url: string, withThinking: boolean) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The header, never the ?key= query form: URLs end up in access logs.
          "x-goog-api-key": key,
        },
        body: JSON.stringify(buildBody(withThinking)),
        signal: controller.signal,
      });
      return { status: response.status, text: await response.text() };
    } finally {
      clearTimeout(timer);
    }
  };

  const urlFor = (name: string) =>
    process.env.GEMINI_API_URL?.trim() ||
    `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent`;

  let result = await post(endpoint, true);

  // A model generation that does not know `thinkingConfig` refuses the whole
  // request. The read matters more than the saving, so drop the block and go
  // again rather than failing the upload over a cost setting.
  if (result.status === 400 && /thinking/i.test(result.text)) {
    logger.warn("Gemini rejected the thinking config; retrying without it", {
      model,
    });
    result = await post(endpoint, false);
  }

  // The pinned model has been retired. Keep working on the rolling alias and
  // say so loudly enough that someone updates GEMINI_MODEL.
  if (result.status === 404 && model !== FALLBACK_MODEL) {
    logger.error(
      "Gemini model is retired - falling back. Update GEMINI_MODEL.",
      { model, fallback: FALLBACK_MODEL },
    );
    result = await post(urlFor(FALLBACK_MODEL), true);
    if (result.status === 400 && /thinking/i.test(result.text)) {
      result = await post(urlFor(FALLBACK_MODEL), false);
    }
  }

  if (result.status !== 200) {
    throw new Error(
      `Gemini returned ${result.status}: ${result.text.slice(0, 300)}`,
    );
  }

  const raw = JSON.parse(result.text);
  const candidate = raw?.candidates?.[0];
  const jsonText: string | undefined = candidate?.content?.parts?.[0]?.text;

  if (!jsonText) {
    // A blocked or empty candidate says why in `finishReason`; carrying it
    // into the message is the difference between a five-minute diagnosis and
    // an afternoon of guessing.
    throw new Error(
      `Gemini returned no content (finishReason: ${candidate?.finishReason ?? "none"})`,
    );
  }

  let read: any;
  try {
    read = JSON.parse(jsonText);
  } catch {
    // Measured, not theoretical: with heavier thinking the reply is cut off
    // mid-JSON and comes back with finishReason MAX_TOKENS.
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new Error(
        "Gemini ran out of output budget before finishing the JSON - raise MAX_OUTPUT_TOKENS",
      );
    }
    throw new Error("Gemini did not return valid JSON");
  }

  // The stored raw response keeps the usage figures for cost debugging but
  // never the image we sent - the response does not echo it, and nothing here
  // re-adds it.
  return sanitise(read, raw);
}

/* ---------------------------- sanitisation ------------------------------ */

/** Keep a number only if it is a value a lens could actually be made in. */
function accept(
  value: unknown,
  min: number,
  max: number,
  step = true,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return step ? roundToStep(value) : Math.round(value);
}

/**
 * Everything the model claims, filtered down to what the form is allowed to
 * hold. A schema guarantees the shape; it does not stop a misread -23.00, an
 * axis of 300, or an invented base direction - those die here, silently,
 * because a dropped field simply becomes one the customer types themselves.
 */
function sanitise(read: any, raw: unknown): OcrExtraction {
  const values: PrescriptionValues = {
    right: { ...EMPTY_PRESCRIPTION.right },
    left: { ...EMPTY_PRESCRIPTION.left },
    pdSingle: null,
    pdRight: null,
    pdLeft: null,
  };
  const found: string[] = [];

  const notPrescription = read?.isSpectaclePrescription === false;
  // A contact lens prescription is a real prescription for the wrong thing.
  // Its powers are measured at the eye, not 12mm in front of it, so cutting
  // spectacles to them would be wrong by a quarter of a dioptre or more at
  // any real power - and wrong in a way the customer would only find out by
  // wearing them.
  const contactLenses = read?.isContactLensPrescription === true;
  const unusable = notPrescription || contactLenses;

  if (!unusable) {
    (["right", "left"] as const).forEach((side) => {
      const eye = read?.[side] ?? {};
      const out: EyeValues = values[side];

      out.sph = accept(eye.sph, SPH_MIN, SPH_MAX);
      out.cyl = accept(eye.cyl, CYL_MIN, CYL_MAX);
      out.axis = accept(eye.axis, AXIS_MIN, AXIS_MAX, false);
      out.add = accept(eye.add, ADD_MIN, ADD_MAX);
      out.prism = accept(eye.prism, 0, PRISM_MAX);

      // An axis is only meaningful with a cylinder; a base only with a prism.
      if ((out.cyl ?? 0) === 0) out.axis = null;
      if (out.cyl !== null && out.cyl !== 0 && out.axis === null) {
        // A cylinder whose axis could not be read cannot be made up - drop
        // the pair rather than hand the form half an astigmatism.
        out.cyl = null;
      }
      const base = String(eye.prismBase ?? "").toUpperCase();
      out.base =
        (out.prism ?? 0) > 0 &&
        (PRISM_BASES as readonly string[]).includes(base)
          ? base
          : null;
      if (out.base === null) out.prism = null;

      if (out.sph !== null) found.push(`${side}Sph`);
      if (out.cyl !== null) found.push(`${side}Cyl`);
      if (out.axis !== null) found.push(`${side}Axis`);
      if (out.add !== null) found.push(`${side}Add`);
    });

    const pdRight = accept(read?.pdRight, PD_MONO_MIN, PD_MONO_MAX, false);
    const pdLeft = accept(read?.pdLeft, PD_MONO_MIN, PD_MONO_MAX, false);
    if (pdRight !== null && pdLeft !== null) {
      values.pdRight = pdRight;
      values.pdLeft = pdLeft;
      found.push("pdRight", "pdLeft");
    } else {
      values.pdSingle = accept(read?.pdBinocular, PD_MIN, PD_MAX, false);
      if (values.pdSingle !== null) found.push("pdSingle");
    }
  }

  // Only the three we know. A model that invents "TRIFOCAL" or answers in
  // prose is treated as having said nothing, which is the safe reading.
  const DESIGNS = ["SINGLE_VISION", "BIFOCAL", "PROGRESSIVE"];
  const prescribedDesign =
    !unusable &&
    typeof read?.prescribedDesign === "string" &&
    DESIGNS.includes(read.prescribedDesign.toUpperCase())
      ? (read.prescribedDesign.toUpperCase() as
          | "SINGLE_VISION"
          | "BIFOCAL"
          | "PROGRESSIVE")
      : null;

  const confidence =
    typeof read?.confidence === "number" &&
    read.confidence >= 0 &&
    read.confidence <= 1
      ? read.confidence
      : null;

  if (prescribedDesign) found.push("prescribedDesign");

  return {
    provider: "gemini",
    values,
    prescribedDesign,
    found,
    confidence: unusable ? 0 : confidence,
    issuedAt: unusable ? null : normaliseDate(read?.issuedDate),
    warning: contactLenses
      ? "That looks like a contact lens prescription. Contact lens powers are not the same as spectacle powers - send us your glasses prescription, or type it in below."
      : notPrescription
        ? "That doesn't look like a spectacle prescription - if it is, type the values in below."
        : null,
    raw,
  };
}

/** "2026-01-15", or nothing - a half-read date is worse than no date. */
function normaliseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(`${match[0]}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // A prescription from the future is a misread year.
  if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  return match[0];
}
