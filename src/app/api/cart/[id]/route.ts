import { NextRequest } from "next/server";
import { updateCartItem, removeFromCart } from "@/features/cart/services/cart-service";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { z } from "zod";
import { logApiAction, logApiError } from "@/lib/audit";

const updateCartSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = await request.json();
    const data = updateCartSchema.parse(body);

    const cartItem = await updateCartItem(session.user.id, id, {
      quantity: data.quantity,
    });

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "cart_update",
      resourceId: id,
    });

    return createSuccessResponse({ cartItem });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = Number(rawId);
    await removeFromCart(session.user.id, id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "cart_remove",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Item removed from cart" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
