import { NextRequest } from "next/server";
import { createCategorySchema, getCategoriesQuerySchema } from "@/features/categories/validators/category";
import { getCategories, createCategory } from "@/features/categories/services/category-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const query = getCategoriesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    // Only an admin may ask for inactive categories; the storefront and any
    // stranger see the active tree whatever they put in the query string.
    const isAdmin = await requireAdmin().then(() => true, () => false);
    if (!isAdmin) query.status = "active";

    const result = await getCategories(query);

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
