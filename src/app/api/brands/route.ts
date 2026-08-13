import { NextRequest } from "next/server";
import { createBrandSchema } from "@/features/brands/validators/brand";
import { getBrands, createBrand } from "@/features/brands/services/brand-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    // Only admins may see inactive brands.
    const includeInactive =
      request.nextUrl.searchParams.get("includeInactive") === "true";

    if (includeInactive) await requireAdmin();

    const brands = await getBrands({ includeInactive });
    return createSuccessResponse({ brands });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const body = await request.json();
    const data = createBrandSchema.parse(body);
    const brand = await createBrand(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "brand_create",
      resourceId: brand.id,
    });

    return createSuccessResponse({ brand }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
