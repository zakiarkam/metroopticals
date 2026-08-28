import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { getSaleById } from "@/features/pos/services/pos-sale-service";
import { logApiError } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Invalid bill id");
    }
    return createSuccessResponse({ sale: await getSaleById(id) });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
