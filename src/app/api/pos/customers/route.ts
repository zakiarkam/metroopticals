import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import {
  createCustomerSchema,
  customerQuerySchema,
} from "@/features/pos/validators/pos";
import {
  createCustomer,
  findCustomerByPhone,
  getCustomers,
} from "@/features/pos/services/pos-customer-service";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * The counter's customer book. `?phone=` is the till's own lookup: it answers
 * with the single matching customer, or null, so typing a number can fill the
 * form in without the cashier choosing from a list.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);

    const phone = searchParams.get("phone");
    if (phone) {
      const customer = await findCustomerByPhone(phone);
      return createSuccessResponse({ customer });
    }

    const query = customerQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );
    return createSuccessResponse(await getCustomers(query));
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const data = createCustomerSchema.parse(await request.json());
    const customer = await createCustomer(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "pos_customer_create",
      resourceId: customer.id,
    });

    return createSuccessResponse({ customer }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
