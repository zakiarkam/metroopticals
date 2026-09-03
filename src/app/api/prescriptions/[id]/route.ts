import { NextRequest } from "next/server";

import { updatePrescriptionSchema } from "@/features/prescriptions/validators/prescription";
import {
  archivePrescription,
  getPrescriptionHistory,
  updatePrescription,
} from "@/features/prescriptions/services/prescription-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

async function resolveId(context: Context) {
  const { id } = await context.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("Invalid prescription id");
  }
  return parsed;
}

/** Every version of this prescription, oldest first. */
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await requireAuth();
    const id = await resolveId(context);
    const versions = await getPrescriptionHistory(session.user.id, id);
    return createSuccessResponse({ versions });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const id = await resolveId(context);

    const body = await request.json();
    const data = updatePrescriptionSchema.parse(body);
    const prescription = await updatePrescription(session.user.id, id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "prescription_update",
      resourceId: id,
    });

    return createSuccessResponse({ prescription });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const id = await resolveId(context);
    const result = await archivePrescription(session.user.id, id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: result.deleted ? "prescription_delete" : "prescription_archive",
      resourceId: id,
    });

    return createSuccessResponse({
      message: result.deleted
        ? "Prescription removed"
        : "Prescription archived — it stays on the orders it was used for",
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
