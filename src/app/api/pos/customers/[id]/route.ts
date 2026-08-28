import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { updateCustomerSchema } from "@/features/pos/validators/pos";
import {
  getCustomerById,
  updateCustomer,
} from "@/features/pos/services/pos-customer-service";
import { logApiAction, logApiError } from "@/lib/audit";

const parseId = (raw: string) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid customer id");
  }
  return id;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { id } = await params;
    return createSuccessResponse({ customer: await getCustomerById(parseId(id)) });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { id } = await params;
    const customerId = parseId(id);
    const data = updateCustomerSchema.parse(await request.json());
    const customer = await updateCustomer(customerId, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "pos_customer_update",
      resourceId: customerId,
    });

    return createSuccessResponse({ customer });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
