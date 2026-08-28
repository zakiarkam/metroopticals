import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse, NotFoundError } from "@/lib/errors";
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
  try {
    const { id: rawId } = await params;
    const id = parseIdParam(rawId);
    const advertisement = await getAdvertisementById(id);

    // A draft or expired ad exists only for the admin who scheduled it; to
    // anyone else the row is simply not there.
    const isAdmin = await requireAdmin().then(() => true, () => false);
    if (!isAdmin) {
      const now = Date.now();
      const live =
        advertisement.status === "active" &&
        (!advertisement.startDate || advertisement.startDate.getTime() <= now) &&
        (!advertisement.endDate || advertisement.endDate.getTime() >= now);
      if (!live) throw new NotFoundError("Advertisement not found");
    }

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
  const id = parseIdParam(rawId);
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
  const id = parseIdParam(rawId);
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
