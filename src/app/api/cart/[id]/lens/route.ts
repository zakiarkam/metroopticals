import { NextRequest } from "next/server";

import { parseIdParam } from "@/lib/utils/params";
import { setCartItemLensSchema } from "@/features/cart/validators/cart";
import { setCartItemLens } from "@/features/cart/services/cart-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * Fit lenses to a basket line, or take them off with `lensTypeId: null`.
 *
 * Kept apart from the quantity/colour update so that changing how many of a
 * frame you want never has to restate the whole lens choice, and so that a
 * lens change is its own line in the audit log.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = parseIdParam(rawId);

    const body = await request.json();
    const data = setCartItemLensSchema.parse(body);

    const cartItem = await setCartItemLens(session.user.id, id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: data.lensTypeId ? "cart_lens_set" : "cart_lens_clear",
      resourceId: id,
    });

    return createSuccessResponse({ cartItem });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
