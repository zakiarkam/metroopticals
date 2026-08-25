import { NextRequest } from "next/server";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { getDashboardSummary } from "@/features/dashboard/services/dashboard-service";
import { requireSuperAdmin } from "@/lib/middleware/auth";
import { logger, serializeError } from "@/lib/logger";

const ALLOWED_RANGES = new Set([7, 30, 90, 365]);

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const requested = Number(request.nextUrl.searchParams.get("dateRange"));
    const days = ALLOWED_RANGES.has(requested) ? requested : 30;
    const data = await getDashboardSummary(days);
    return createSuccessResponse(data);
  } catch (error) {
    logger.error("Dashboard API Error", serializeError(error));
    return handleError(error);
  }
}
