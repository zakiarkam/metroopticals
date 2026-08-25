import { handleError, createSuccessResponse } from "@/lib/errors";
import { getDashboardSummary } from "@/features/dashboard/services/dashboard-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { logger, serializeError } from "@/lib/logger";

export async function GET() {
  try {
    await requireAdmin();
    const data = await getDashboardSummary();
    return createSuccessResponse(data);
  } catch (error) {
    logger.error("Dashboard API Error", serializeError(error));
    return handleError(error);
  }
}
