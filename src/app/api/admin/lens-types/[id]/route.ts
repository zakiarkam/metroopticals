import { NextRequest } from "next/server";

import { updateLensTypeSchema } from "@/features/lenses/validators/lens";
import {
  deleteLensType,
  getLensTypeById,
  updateLensType,
} from "@/features/lenses/services/lens-service";
import { requireSuperAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

async function resolveId(context: Context) {
  const { id } = await context.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError("Invalid lens id");
  }
  return parsed;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireSuperAdmin();
    const lensType = await getLensTypeById(await resolveId(context));
    return createSuccessResponse({ lensType });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  const start = Date.now();
  try {
    await requireSuperAdmin();
    const id = await resolveId(context);

    const body = await request.json();
    const data = updateLensTypeSchema.parse(body);
    const lensType = await updateLensType(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "lens_type_update",
      resourceId: id,
    });

    return createSuccessResponse({ lensType });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const start = Date.now();
  try {
    await requireSuperAdmin();
    const id = await resolveId(context);
    const result = await deleteLensType(id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: result.deactivated ? "lens_type_deactivate" : "lens_type_delete",
      resourceId: id,
    });

    return createSuccessResponse({
      message: result.deactivated
        ? `Switched off — it stays on the ${result.sold} order ${result.sold === 1 ? "line" : "lines"} already sold with it`
        : "Lens removed",
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
