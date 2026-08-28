import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { updateCategoryStatusSchema } from "@/features/categories/validators/category";
import { updateCategoryStatus } from "@/features/categories/services/category-service";
import { logApiAction, logApiError } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { id: rawId } = await params;
    const id = parseIdParam(rawId);
    const body = await request.json();
    const { status } = updateCategoryStatusSchema.parse(body);

    const category = await updateCategoryStatus(id, status);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "category_status_update",
      resourceId: id,
    });

    return createSuccessResponse({
      category,
      message: "Category status updated successfully",
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
