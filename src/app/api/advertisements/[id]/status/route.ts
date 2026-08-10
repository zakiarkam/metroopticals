import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { updateAdvertisementStatusSchema } from "@/features/advertisements/validators/advertisement";
import { updateAdvertisementStatus } from "@/features/advertisements/services/advertisement-service";
import { logApiAction, logApiError } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = await request.json();
    const { status } = updateAdvertisementStatusSchema.parse(body);

    const advertisement = await updateAdvertisementStatus(id, status);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "advertisement_status_update",
      resourceId: id,
    });

    return createSuccessResponse({ advertisement });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
