import { NextRequest } from "next/server";
import { updateOrderStatusSchema } from "@/features/orders/validators/order";
import { getOrderById, updateOrderStatus } from "@/features/orders/services/order-service";
import { requireAuth, requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = Number(rawId);
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

    const order = await getOrderById(id, session.user.id, isAdmin);

    return createSuccessResponse({ order });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = await request.json();
    const data = updateOrderStatusSchema.parse(body);

    const order = await updateOrderStatus(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "order_status_update",
      resourceId: id,
    });

    return createSuccessResponse({ order });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
