import { NextRequest } from "next/server";
import { createOrderSchema, orderQuerySchema } from "@/features/orders/validators/order";
import { getOrders, createOrder } from "@/features/orders/services/order-service";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      ownOnly: searchParams.get("ownOnly") || undefined,
    };

    const query = orderQuerySchema.parse(queryParams);

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const allowAdminView = isAdmin && !query.ownOnly;
    const result = await getOrders(session.user.id, query, allowAdminView);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "orders_list",
      resourceId: session.user.id,
    });

    return createSuccessResponse(result);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = createOrderSchema.parse(body);

    const order = await createOrder(session.user.id, data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "order_create",
      resourceId: order.id,
    });

    return createSuccessResponse({ order }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
