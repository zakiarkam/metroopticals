import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { stockAdjustSchema } from "@/features/pos/validators/pos";
import { adjustStock } from "@/features/pos/services/pos-stock-service";
import { logApiAction, logApiError } from "@/lib/audit";

/** Receive a delivery, or correct the count to what is actually on the shelf. */
export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAdmin();
    const data = stockAdjustSchema.parse(await request.json());
    const result = await adjustStock(data, session.user.id);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "pos_stock_adjust",
      resourceId: data.productId,
    });

    return createSuccessResponse(result, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
