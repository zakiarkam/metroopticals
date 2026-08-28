import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { updateCategorySchema } from "@/features/categories/validators/category";
import { getCategoryById, updateCategory, deleteCategory } from "@/features/categories/services/category-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseIdParam(rawId);
  try {
    const category = await getCategoryById(id);
    return createSuccessResponse({ category });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseIdParam(rawId);
  const start = Date.now();
  try {
    await requireAdmin();

    const body = await request.json();
    const data = updateCategorySchema.parse(body);

    const category = await updateCategory(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "category_update",
      resourceId: id,
    });

    return createSuccessResponse({ category });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseIdParam(rawId);
  const start = Date.now();
  try {
    await requireAdmin();

    await deleteCategory(id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "category_delete",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Category deleted successfully" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
