import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { voidSaleSchema } from "@/features/pos/validators/pos";
import { voidSale } from "@/features/pos/services/pos-sale-service";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * Cancel a bill. Super admin only: it puts stock back and reverses money
 * already taken, which is not something a busy counter should be able to do
 * to yesterday's takings by accident.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    const session = await requireSuperAdmin();
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Invalid bill id");
    }

    const data = voidSaleSchema.parse(await request.json());
    const sale = await voidSale(id, data, session.user.id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "pos_sale_void",
      resourceId: id,
    });

    return createSuccessResponse({ sale });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
