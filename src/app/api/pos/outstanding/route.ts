import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { getOutstandingBills } from "@/features/pos/services/pos-report-service";
import { logApiError } from "@/lib/audit";

/** The credit book: counter bills with money still to collect. */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    return createSuccessResponse(await getOutstandingBills());
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
