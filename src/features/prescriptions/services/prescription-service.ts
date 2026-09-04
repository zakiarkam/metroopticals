import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { deleteFile } from "@/lib/storage/r2";
import {
  normalisePrescription,
  rowFromValues,
  valuesFromRow,
  describePrescription,
  type PrescriptionValues,
} from "@/features/lenses/utils/prescription";
import type {
  CreatePrescriptionInput,
  PrescriptionQueryInput,
  UpdatePrescriptionInput,
} from "@/features/prescriptions/validators/prescription";

const prescriptionSelect = {
  id: true,
  label: true,
  version: true,
  rootId: true,
  source: true,
  isArchived: true,
  prescribedDesign: true,
  imageFile: true,
  ocrConfidence: true,
  issuedAt: true,
  expiresAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  rightSph: true,
  rightCyl: true,
  rightAxis: true,
  rightAdd: true,
  rightPrism: true,
  rightBase: true,
  leftSph: true,
  leftCyl: true,
  leftAxis: true,
  leftAdd: true,
  leftPrism: true,
  leftBase: true,
  pdSingle: true,
  pdRight: true,
  pdLeft: true,
} as const;

/**
 * The row plus the shapes the UI actually wants: nested values and a summary.
 *
 * The storage key is stripped and replaced with a plain boolean. The browser
 * has no use for it - the slip is fetched from an authenticated route by
 * prescription id - and a key that never leaves the server cannot leak from a
 * cached API response or a screenshot of one.
 */
function present<T extends Record<string, any>>(row: T) {
  const values = valuesFromRow(row);
  const { imageFile, ...rest } = row;
  return {
    ...rest,
    hasImage: Boolean(imageFile),
    values,
    summary: describePrescription(values),
  };
}

const toDate = (value: string | null | undefined) =>
  value ? new Date(value) : null;

/**
 * The customer's prescriptions.
 *
 * By default only the newest version of each chain, because that is what they
 * would want to order against; `includeHistory` returns the superseded ones
 * too for the account page, newest first.
 */
export async function getPrescriptions(
  userId: number,
  query: PrescriptionQueryInput,
) {
  const rows = await prisma.prescription.findMany({
    where: {
      userId,
      ...(query.includeArchived ? {} : { isArchived: false }),
    },
    select: prescriptionSelect,
    orderBy: [{ createdAt: "desc" }],
  });

  if (query.includeHistory) return rows.map(present);

  // One row per chain: whichever version of it is highest. A row with no
  // rootId is version 1 of its own chain, so it keys on its own id.
  const newest = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const chain = row.rootId ?? row.id;
    const held = newest.get(chain);
    if (!held || row.version > held.version) newest.set(chain, row);
  }

  return [...newest.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(present);
}

export async function getPrescriptionById(userId: number, id: number) {
  const row = await prisma.prescription.findUnique({
    where: { id },
    select: { ...prescriptionSelect, userId: true },
  });

  // Another customer's prescription is reported missing rather than
  // forbidden: whose it is, is itself the thing not to leak.
  if (!row || row.userId !== userId) {
    throw new NotFoundError("Prescription not found");
  }

  const { userId: _ownerId, ...rest } = row;
  return present(rest);
}

/** Every version of one chain, oldest first - the account page's history. */
export async function getPrescriptionHistory(userId: number, id: number) {
  const anchor = await prisma.prescription.findUnique({
    where: { id },
    select: { id: true, rootId: true, userId: true },
  });

  if (!anchor || anchor.userId !== userId) {
    throw new NotFoundError("Prescription not found");
  }

  const chain = anchor.rootId ?? anchor.id;

  const rows = await prisma.prescription.findMany({
    where: { userId, OR: [{ id: chain }, { rootId: chain }] },
    select: prescriptionSelect,
    orderBy: [{ version: "asc" }],
  });

  return rows.map(present);
}

/**
 * Save a prescription, or the next version of one already on file.
 *
 * Re-testing is the normal case for a returning customer: a year later the
 * powers change, and both sets matter - the new one for what they are buying
 * now, the old one for what their last pair was made to. So a re-test writes
 * version 2 alongside version 1 rather than over it.
 *
 * Powers are transposed into minus-cylinder form on the way in, so every row
 * in the table is comparable with every other and with the price list.
 */
export async function createPrescription(
  userId: number,
  data: CreatePrescriptionInput,
) {
  const values = normalisePrescription(data.values as PrescriptionValues);

  let version = 1;
  let rootId: number | null = null;

  if (data.supersedesId) {
    const previous = await prisma.prescription.findUnique({
      where: { id: data.supersedesId },
      select: {
        id: true,
        userId: true,
        rootId: true,
        version: true,
        label: true,
      },
    });

    if (!previous || previous.userId !== userId) {
      throw new NotFoundError("Prescription not found");
    }

    rootId = previous.rootId ?? previous.id;

    // The highest version in the chain, not the one being replaced: two tabs
    // open would otherwise both write version 2.
    const latest = await prisma.prescription.aggregate({
      where: { userId, OR: [{ id: rootId }, { rootId }] },
      _max: { version: true },
    });

    version = (latest._max.version ?? previous.version) + 1;

    if (version > MAX_VERSIONS_PER_CHAIN) {
      throw new ValidationError(
        "This prescription has been updated many times - save these powers as a new prescription instead.",
      );
    }
  }

  // The storage key is looked up from our own extraction row, never taken
  // from the request: the client only ever names the file by its hash, which
  // it cannot produce without having uploaded that exact file.
  let imageFile: string | null = null;
  if (data.extractionHash) {
    const extraction = await prisma.prescriptionExtraction.findUnique({
      where: { fileHash: data.extractionHash },
      select: { storedFile: true },
    });
    imageFile = extraction?.storedFile ?? null;
  }

  const created = await prisma.prescription.create({
    data: {
      userId,
      label: data.label,
      version,
      rootId,
      source: data.source,
      prescribedDesign: data.prescribedDesign ?? null,
      imageFile,
      ocrConfidence: data.ocrConfidence ?? null,
      issuedAt: toDate(data.issuedAt),
      expiresAt: toDate(data.expiresAt),
      notes: data.notes?.trim() || null,
      ...rowFromValues(values),
    },
    select: prescriptionSelect,
  });

  return present(created);
}

/** Rename, re-date or archive. The powers are never edited in place. */
export async function updatePrescription(
  userId: number,
  id: number,
  data: UpdatePrescriptionInput,
) {
  const existing = await prisma.prescription.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new NotFoundError("Prescription not found");
  }

  const updated = await prisma.prescription.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.prescribedDesign !== undefined
        ? { prescribedDesign: data.prescribedDesign }
        : {}),
      ...(data.notes !== undefined
        ? { notes: data.notes?.trim() || null }
        : {}),
      ...(data.expiresAt !== undefined
        ? { expiresAt: toDate(data.expiresAt) }
        : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
    select: prescriptionSelect,
  });

  return present(updated);
}

/**
 * Archive rather than delete.
 *
 * A prescription an order was made to is part of that order's record - the
 * shop has to be able to answer "what did we make these to?" years later, and
 * a customer asking for the same again should get the same again. So it is
 * hidden from the picker and kept.
 */
export async function archivePrescription(userId: number, id: number) {
  const existing = await prisma.prescription.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new NotFoundError("Prescription not found");
  }

  const used = await prisma.orderItem.count({ where: { prescriptionId: id } });

  if (used === 0) {
    // Never ordered against: nothing to preserve, so it really goes.
    await prisma.cartItem.updateMany({
      where: { prescriptionId: id },
      data: { prescriptionId: null },
    });

    const row = await prisma.prescription.findUnique({
      where: { id },
      select: { imageFile: true },
    });

    await prisma.prescription.delete({ where: { id } });

    // The document goes with the record. A customer who deletes a
    // prescription has asked us to stop holding it, and leaving the scan of
    // their optometrist's letter in storage would not be honouring that.
    if (row?.imageFile) await forgetSlip(row.imageFile);

    return { deleted: true as const };
  }

  await prisma.prescription.update({
    where: { id },
    data: { isArchived: true },
  });
  return { deleted: false as const };
}

/**
 * Remove a stored slip, unless something else still points at it.
 *
 * Two customers uploading byte-identical files share one object, because the
 * extraction cache reuses it. Deleting one person's record must not blank the
 * other's, so the object only goes when nothing references it any more.
 */
async function forgetSlip(imageFile: string) {
  try {
    const stillUsed = await prisma.prescription.count({ where: { imageFile } });
    if (stillUsed > 0) return;

    await prisma.prescriptionExtraction.updateMany({
      where: { storedFile: imageFile },
      data: { storedFile: null },
    });

    await deleteFile("prescription/private", imageFile);
  } catch (error) {
    // The row is already gone and that is what the customer asked for. A
    // failed cleanup is a job for a sweep, not a reason to fail the request.
    logger.warn("Could not remove a stored prescription slip", {
      error: String(error),
    });
  }
}

/**
 * The number of live prescription CHAINS - a record and all its versions
 * count as one, because that is how the customer sees them.
 */
export async function countPrescriptions(userId: number) {
  const rows = await prisma.prescription.findMany({
    where: { userId, isArchived: false },
    select: { id: true, rootId: true },
  });
  return new Set(rows.map((row) => row.rootId ?? row.id)).size;
}

/**
 * Guard against a customer hoarding prescriptions to fill the table.
 *
 * Counted in chains, not rows: a customer re-tested yearly for a decade holds
 * one prescription with ten versions, and must never be told they have forty.
 * The rows inside a chain are bounded separately by `MAX_VERSIONS_PER_CHAIN`,
 * so neither axis is unbounded.
 */
export const MAX_PRESCRIPTIONS_PER_USER = 40;
export const MAX_VERSIONS_PER_CHAIN = 20;

export async function assertPrescriptionQuota(userId: number) {
  const held = await countPrescriptions(userId);
  if (held >= MAX_PRESCRIPTIONS_PER_USER) {
    throw new ValidationError(
      `You can keep up to ${MAX_PRESCRIPTIONS_PER_USER} prescriptions. Remove one you no longer use.`,
    );
  }
}
