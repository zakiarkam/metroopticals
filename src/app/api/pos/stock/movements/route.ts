import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { stockMovementQuerySchema } from "@/features/pos/validators/pos";
import { getStockMovements } from "@/features/pos/services/pos-stock-service";
import { logApiError } from "@/lib/audit";

/** The history behind the stock count. */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = stockMovementQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    return createSuccessResponse(await getStockMovements(query));
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
