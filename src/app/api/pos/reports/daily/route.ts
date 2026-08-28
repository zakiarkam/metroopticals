import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { dailyReportQuerySchema } from "@/features/pos/validators/pos";
import { getPosReport } from "@/features/pos/services/pos-report-service";
import { logApiError } from "@/lib/audit";

/**
 * Counter takings for a shop day or a range of them. Available to any admin:
 * cashing up at the end of a shift is the counter's own job.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = dailyReportQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new ValidationError("The start date must come before the end date");
    }

    return createSuccessResponse(await getPosReport(query));
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
