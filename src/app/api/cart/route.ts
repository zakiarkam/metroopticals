import { NextRequest } from 'next/server'
import { addToCartSchema } from '@/features/cart/validators/cart'
import { getCartItems, addToCart, clearCart } from '@/features/cart/services/cart-service'
import { requireAuth } from '@/lib/middleware/auth'
import { handleError, createSuccessResponse } from '@/lib/errors'
import { logApiAction, logApiError } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const cartItems = await getCartItems(session.user.id)
    
    return createSuccessResponse({ cartItems })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const session = await requireAuth()
    const body = await request.json()
    const data = addToCartSchema.parse(body)
    
    const cartItem = await addToCart(session.user.id, data)
    
    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: 'cart_add',
      resourceId: data.productId,
    })

    return createSuccessResponse({ cartItem }, 201)
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now()
  try {
    const session = await requireAuth()
    await clearCart(session.user.id)
    
    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: 'cart_clear',
      resourceId: session.user.id,
    })

    return createSuccessResponse({ message: 'Cart cleared successfully' })
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start })
    return handleError(error)
  }
}
