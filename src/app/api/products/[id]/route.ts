import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { updateProductSchema } from "@/features/products/validators/product";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/features/products/services/product-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse, NotFoundError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Inside the try so a mistyped id is a clean 400, not an unhandled 500.
    const { id: rawId } = await params;
    const id = parseIdParam(rawId);

    const product = await getProductById(id);
    if (product.status !== "ACTIVE") {
      await requireAdmin().catch(() => {
        throw new NotFoundError("Product not found");
      });
    }
    return createSuccessResponse({ product });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();

  try {
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseIdParam(rawId);

    const body = await request.json();
    const data = updateProductSchema.parse(body);

    const product = await updateProduct(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_update",
      resourceId: id,
    });

    return createSuccessResponse({ product });
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
    await requireAdmin();
    const { id: rawId } = await params;
    const id = parseIdParam(rawId);

    await deleteProduct(id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_delete",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Product deleted successfully" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
