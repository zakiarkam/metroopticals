import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { ValidationError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import { uploadFile } from "@/lib/storage/r2";
import { extractPrescription, getOcrProvider } from "@/lib/prescription-ocr";
import type { PrescriptionValues } from "@/features/lenses/utils/prescription";
import { EMPTY_PRESCRIPTION } from "@/features/lenses/utils/prescription";

/** What an uploaded slip may be: a photo of it, or the PDF the optician mailed. */
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const MAX_BYTES = 8 * 1024 * 1024;

/** The same magic-byte check the admin uploader does, for the same reason. */
function sniff(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  // HEIC/HEIF are ISO-BMFF: "ftyp" at offset 4, brand after it.
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = bytes.subarray(8, 12).toString("ascii");
    if (["heic", "heix", "hevc", "mif1", "msf1", "heim"].includes(brand)) {
      return "image/heic";
    }
  }
  return null;
}

export type ExtractionResult = {
  values: PrescriptionValues;
  /** What the prescriber wrote to make - "Bifocals", "PAL" - or null. */
  prescribedDesign: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  /** Field names the reader supplied, so the form can mark them for review. */
  found: string[];
  confidence: number | null;
  issuedAt: string | null;
  /** A sentence worth showing the customer - "this is not a prescription". */
  warning: string | null;
  /** True when this came out of the cache and cost nothing. */
  cached: boolean;
  /** Whether the slip itself was kept, so the shop can check it later. */
  stored: boolean;
  /** The file's hash, so the client can ask for the same read again for free. */
  fileHash: string;
  provider: string;
};

/**
 * The extension to store a slip under, from the type its bytes actually are.
 * Never from the name the browser sent.
 */
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

/**
 * Keep the slip, under a name nobody can guess.
 *
 * The shop has to be able to check the powers against the document before it
 * cuts lenses - a transposed digit is a wasted pair and a customer who cannot
 * see. So the file is kept; the care goes into who can reach it.
 *
 * The object store is served from a PUBLIC read URL, so an object's only
 * protection from a stranger is that its key cannot be guessed. Hence 32
 * random bytes rather than the file's hash: a content hash is reproducible by
 * anyone holding the same file, a random name is not reproducible at all.
 * Nothing ever builds the public URL - the file is read back server-side and
 * streamed by an authenticated route.
 *
 * A storage failure is logged and swallowed. Losing the picture is a nuisance
 * for the shop; failing the upload over it would cost the customer their
 * order.
 */
async function storeSlip(
  bytes: Buffer,
  contentType: string,
): Promise<string | null> {
  try {
    const extension = EXTENSION_BY_TYPE[contentType] ?? "bin";
    const fileName = `${randomBytes(32).toString("hex")}.${extension}`;

    const result = await uploadFile({
      folder: "prescription/private",
      file: new File([new Uint8Array(bytes)], fileName, { type: contentType }),
      customFileName: fileName,
    });

    return result.fileName;
  } catch (error) {
    logger.error("Could not store the prescription slip", {
      error: serializeError(error),
    });
    return null;
  }
}

/**
 * Read a prescription off an uploaded file.
 *
 * The slip is kept so the shop can verify the powers against the document
 * before making the lenses - see `storeSlip` for how it is kept private.
 *
 * The read is cached on the file's own SHA-256. A shopper who uploads, sees
 * the price, wonders about progressives and comes back gets the same values
 * from the cache; the paid reader is called once per distinct file, ever, and
 * the same slip is stored once rather than once per attempt.
 */
export async function extractFromUpload({
  bytes,
  fileName,
  declaredType,
}: {
  bytes: Buffer;
  fileName: string;
  declaredType: string;
}): Promise<ExtractionResult> {
  if (bytes.length === 0) throw new ValidationError("That file is empty");
  if (bytes.length > MAX_BYTES) {
    throw new ValidationError("The file must be 8MB or smaller");
  }

  const sniffed = sniff(bytes);
  if (!sniffed || !ACCEPTED_TYPES.includes(sniffed)) {
    throw new ValidationError(
      "Upload a photo of your prescription (JPG, PNG, HEIC) or the PDF",
    );
  }
  // The browser's own label is only trusted when the bytes agree with it.
  if (
    declaredType &&
    declaredType !== sniffed &&
    !declaredType.startsWith("image/")
  ) {
    throw new ValidationError(
      "That file does not look like what it claims to be",
    );
  }

  const fileHash = createHash("sha256").update(bytes).digest("hex");

  const cached = await prisma.prescriptionExtraction.findUnique({
    where: { fileHash },
  });

  if (cached) {
    const parsed = cached.parsed as {
      values?: PrescriptionValues;
      found?: string[];
      issuedAt?: string | null;
      warning?: string | null;
      prescribedDesign?: ExtractionResult["prescribedDesign"];
    };

    // A row from before the slip was kept, or one whose store failed. Fill it
    // in now so the shop is not left without the picture for good.
    let storedFile = cached.storedFile;
    if (!storedFile) {
      storedFile = await storeSlip(bytes, sniffed);
      if (storedFile) {
        await prisma.prescriptionExtraction
          .update({ where: { fileHash }, data: { storedFile } })
          .catch(() => undefined);
      }
    }

    return {
      values: parsed.values ?? EMPTY_PRESCRIPTION,
      prescribedDesign: parsed.prescribedDesign ?? null,
      found: parsed.found ?? [],
      confidence: cached.confidence,
      issuedAt: parsed.issuedAt ?? null,
      warning: parsed.warning ?? null,
      cached: true,
      stored: Boolean(storedFile),
      fileHash,
      provider: cached.provider,
    };
  }

  const provider = getOcrProvider();
  if (!provider) {
    throw new ValidationError(
      "Reading prescriptions from a photo is not switched on. Enter yours below instead.",
    );
  }

  // Stored before the read, and regardless of how the read goes: a slip the
  // reader could not make sense of is exactly the one the shop most needs to
  // look at by hand.
  const [storedFile, extraction] = await Promise.all([
    storeSlip(bytes, sniffed),
    extractPrescription({ bytes, fileName, contentType: sniffed }),
  ]);

  if (!extraction) {
    throw new ValidationError(
      "We couldn't read that one. Enter your prescription below and we'll price it straight away.",
    );
  }

  // Cached even when nothing optical was recognised: a second upload of a file
  // the reader could not use should not cost a second call either.
  await prisma.prescriptionExtraction
    .create({
      data: {
        fileHash,
        provider: extraction.provider,
        raw: extraction.raw as never,
        parsed: {
          values: extraction.values,
          prescribedDesign: extraction.prescribedDesign,
          found: extraction.found,
          issuedAt: extraction.issuedAt,
          warning: extraction.warning,
        } as never,
        confidence: extraction.confidence,
        storedFile,
      },
    })
    .catch((error) => {
      // A racing upload of the same file already wrote the row. The read is
      // done and correct; failing the request over the cache would be absurd.
      logger.warn("Could not cache prescription extraction", {
        fileHash,
        error: String(error),
      });
    });

  return {
    values: extraction.values,
    prescribedDesign: extraction.prescribedDesign,
    found: extraction.found,
    confidence: extraction.confidence,
    issuedAt: extraction.issuedAt,
    warning: extraction.warning,
    cached: false,
    stored: Boolean(storedFile),
    fileHash,
    provider: extraction.provider,
  };
}
