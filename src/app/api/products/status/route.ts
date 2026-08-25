import { NextRequest } from 'next/server'
import { productStatusQuerySchema } from '@/features/products/validators/product'
import { getProducts } from '@/features/products/services/product-service'
import { handleError, createSuccessResponse } from '@/lib/errors'
import { requireAdmin } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = productStatusQuerySchema.parse(Object.fromEntries(searchParams))

    // Non-active products (unreleased/withdrawn stock) are admin-only.
    if (query.status !== 'ACTIVE') {
      await requireAdmin()
    }

    const result = await getProducts(query as any)

    return createSuccessResponse(result)
  } catch (error) {
    return handleError(error)
  }
}
