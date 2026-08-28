import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { getPosFilters } from "@/features/pos/services/pos-catalogue-service";
import { logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    return createSuccessResponse(await getPosFilters());
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
