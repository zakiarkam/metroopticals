import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { updateProductStatusSchema } from "@/features/products/validators/product";
import { updateProductStatus } from "@/features/products/services/product-service";
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
    const { status } = updateProductStatusSchema.parse(body);

    const product = await updateProductStatus(id, status);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_status_update",
      resourceId: id,
    });

    return createSuccessResponse({ product });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
