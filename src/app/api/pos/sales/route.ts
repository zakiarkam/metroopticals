import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { createSaleSchema, saleQuerySchema } from "@/features/pos/validators/pos";
import { createSale, getSales } from "@/features/pos/services/pos-sale-service";
import { logApiAction, logApiError } from "@/lib/audit";

/** Counter sales history, newest first, with totals for the whole filter. */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = saleQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    return createSuccessResponse(await getSales(query));
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

/**
 * Write a bill.
 *
 * Unlike a storefront order this sends no confirmation email and no WhatsApp
 * message: the customer is standing at the counter and walks away with the
 * printed bill in their hand.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAdmin();
    const data = createSaleSchema.parse(await request.json());
    const sale = await createSale(data, session.user.id);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "pos_sale_create",
      resourceId: sale.id,
    });

    return createSuccessResponse({ sale }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
