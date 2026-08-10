import { handleError, createSuccessResponse } from "@/lib/errors";
import { getDashboardSummary } from "@/features/dashboard/services/dashboard-service";
import { logger, serializeError } from "@/lib/logger";

export async function GET() {
  try {
    const data = await getDashboardSummary();
    return createSuccessResponse(data);
  } catch (error) {
    logger.error("Dashboard API Error", serializeError(error));
    return handleError(error);
  }
}
