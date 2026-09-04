import { NextRequest } from "next/server";

import {
  createPrescriptionSchema,
  prescriptionQuerySchema,
} from "@/features/prescriptions/validators/prescription";
import {
  assertPrescriptionQuota,
  createPrescription,
  getPrescriptions,
} from "@/features/prescriptions/services/prescription-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const query = prescriptionQuerySchema.parse({
      includeHistory: request.nextUrl.searchParams.get("includeHistory"),
      includeArchived: request.nextUrl.searchParams.get("includeArchived"),
    });

    const prescriptions = await getPrescriptions(session.user.id, query);
    return createSuccessResponse({ prescriptions });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Save a prescription, or the next version of one already on file.
 *
 * Nothing here is logged with its values: the audit trail records that a
 * customer saved a prescription, never what was in it.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();

    // Nobody types thirty prescriptions in an hour by hand.
    rateLimit(`rx-create:${session.user.id}`, 30, 60 * 60 * 1000);

    const body = await request.json();
    const data = createPrescriptionSchema.parse(body);

    // A new chain needs a free slot; a re-test extends an existing chain and
    // is bounded by its own per-chain version cap instead - otherwise a
    // customer whose eyes changed would be refused for owning too many.
    if (!data.supersedesId) await assertPrescriptionQuota(session.user.id);

    const prescription = await createPrescription(session.user.id, data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: data.supersedesId
        ? "prescription_new_version"
        : "prescription_create",
      resourceId: prescription.id,
    });

    return createSuccessResponse({ prescription }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
