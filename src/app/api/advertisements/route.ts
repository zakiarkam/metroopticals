import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import {
  advertisementQuerySchema,
  createAdvertisementSchema,
} from "@/features/advertisements/validators/advertisement";
import { getAdvertisements, createAdvertisement } from "@/features/advertisements/services/advertisement-service";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = advertisementQuerySchema.parse(Object.fromEntries(searchParams));
    const isAdmin = await requireAdmin().then(() => true, () => false);
    if (!isAdmin) query.status = "active";

    const result = await getAdvertisements(query);

    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const body = await request.json();
    const data = createAdvertisementSchema.parse(body);

    const advertisement = await createAdvertisement(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "advertisement_create",
      resourceId: advertisement.id,
    });

    return createSuccessResponse({ advertisement }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
