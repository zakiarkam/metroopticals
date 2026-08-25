import { NextRequest } from "next/server";
import {
  productQuerySchema,
  createProductSchema,
} from "@/features/products/validators/product";
import { getProducts, createProduct } from "@/features/products/services/product-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = productQuerySchema.parse(Object.fromEntries(searchParams));
    if (query.status !== "ACTIVE" || !searchParams.has("status")) {
      const isAdmin = await requireAdmin().then(() => true, () => false);
      if (isAdmin) {
        if (!searchParams.has("status")) delete (query as { status?: string }).status;
      } else {
        query.status = "ACTIVE";
      }
    }

    const result = await getProducts(query);

    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const body = await request.json();
    const data = createProductSchema.parse(body);

    const product = await createProduct(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "product_create",
      resourceId: product.id,
    });

    return createSuccessResponse({ product }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
