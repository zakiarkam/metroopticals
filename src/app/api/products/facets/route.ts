import { NextRequest } from "next/server";
import { productQuerySchema } from "@/features/products/validators/product";
import { getProductFacets } from "@/features/products/services/product-service";
import { handleError, createSuccessResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = productQuerySchema.parse(Object.fromEntries(searchParams));
    const facets = await getProductFacets(query);
    return createSuccessResponse({ facets });
  } catch (error) {
    return handleError(error);
  }
}
