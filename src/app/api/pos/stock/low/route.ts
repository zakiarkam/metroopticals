import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { getLowStock } from "@/features/pos/services/pos-stock-service";
import { logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const threshold = Number(searchParams.get("threshold")) || 10;
    return createSuccessResponse(await getLowStock(threshold));
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
