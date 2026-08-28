import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { returnSaleSchema } from "@/features/pos/validators/pos";
import { returnSaleItems } from "@/features/pos/services/pos-sale-service";
import { logApiAction, logApiError } from "@/lib/audit";

/** Take items back off a bill, put them on the shelf, refund the money. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    const session = await requireAdmin();
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Invalid bill id");
    }

    const data = returnSaleSchema.parse(await request.json());
    const sale = await returnSaleItems(id, data, session.user.id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "pos_sale_return",
      resourceId: id,
    });

    return createSuccessResponse({ sale });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
