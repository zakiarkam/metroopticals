import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { incrementProductStockSchema } from "@/features/products/validators/product";
import { incrementProductStock } from "@/features/products/services/product-service";
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

    const validatedData = incrementProductStockSchema.parse(body);
    const product = await incrementProductStock(id, validatedData.count);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_stock_increment",
      resourceId: id,
    });

    return createSuccessResponse({
      product,
      message: "Stock updated successfully",
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
