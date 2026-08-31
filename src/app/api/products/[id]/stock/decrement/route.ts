import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { incrementProductStockSchema } from "@/features/products/validators/product";
import { decrementProductStock } from "@/features/products/services/product-service";
import { logApiAction, logApiError } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    const session = await requireAdmin();

    const { id: rawId } = await params;
    const id = parseIdParam(rawId);
    const body = await request.json();
    const { count, color } = incrementProductStockSchema.parse(body);

    const product = await decrementProductStock(
      id,
      count,
      session.user.id,
      color,
    );

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_stock_decrement",
      resourceId: id,
    });

    return createSuccessResponse({ product });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
