import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { updateAdvertisementSchema } from "@/features/advertisements/validators/advertisement";
import {
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement,
} from "@/features/advertisements/services/advertisement-service";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  try {
    const advertisement = await getAdvertisementById(id);
    return createSuccessResponse({ advertisement });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const start = Date.now();
  try {
    await requireAdmin();

    const body = await request.json();
    const data = updateAdvertisementSchema.parse(body);

    const advertisement = await updateAdvertisement(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "advertisement_update",
      resourceId: id,
    });

    return createSuccessResponse({ advertisement });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const start = Date.now();
  try {
    await requireAdmin();
    await deleteAdvertisement(id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "advertisement_delete",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Advertisement deleted successfully" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
