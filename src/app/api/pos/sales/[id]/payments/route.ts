import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { addPaymentSchema } from "@/features/pos/validators/pos";
import { addSalePayment } from "@/features/pos/services/pos-sale-service";
import { logApiAction, logApiError } from "@/lib/audit";

/** Settle part or all of an outstanding balance on a bill. */
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

    const data = addPaymentSchema.parse(await request.json());
    const sale = await addSalePayment(id, data, session.user.id);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "pos_payment_add",
      resourceId: id,
    });

    return createSuccessResponse({ sale }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
