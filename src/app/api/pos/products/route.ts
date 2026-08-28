import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { posProductQuerySchema } from "@/features/pos/validators/pos";
import { searchPosProducts } from "@/features/pos/services/pos-catalogue-service";
import { logApiError } from "@/lib/audit";

/** Counter product lookup: name, SKU, barcode or brand, with live stock. */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const query = posProductQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const result = await searchPosProducts(query);
    return createSuccessResponse(result);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
