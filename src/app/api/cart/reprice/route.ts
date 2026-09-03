import { NextRequest } from "next/server";

import { repriceCartLenses } from "@/features/cart/services/cart-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";

/**
 * Re-price every lens in the basket against today's price list.
 *
 * Called once when the checkout opens. `createOrder` re-prices too and is the
 * one that actually charges — but discovering a price change *after* filling
 * in an address form is a bad way to find out, so this brings the basket up
 * to date first and reports what moved.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const changed = await repriceCartLenses(session.user.id);
    return createSuccessResponse({ changed });
  } catch (error) {
    return handleError(error);
  }
}
