import { NextRequest } from "next/server";
import { createCategorySchema } from "@/features/categories/validators/category";
import { getCategories, createCategory } from "@/features/categories/services/category-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as "active" | "inactive" | undefined;

    const result = await getCategories({
      page,
      limit,
      search,
      status,
    });

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
    const data = createCategorySchema.parse(body);

    const category = await createCategory(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "category_create",
      resourceId: category.id,
    });

    return createSuccessResponse({ category }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
