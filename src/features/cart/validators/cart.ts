import { z } from 'zod'

/**
 * The chosen colourway.
 *
 * Optional everywhere: most of the catalogue lists no colours, and a product
 * that does list them is still addable without one from a listing card. It is
 * stored as an empty string rather than null so the cart's unique index can
 * collapse repeat adds of the same colour.
 */
const colorRef = z.string().trim().max(60).optional().default('')

export const addToCartSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be positive'),
  color: colorRef,
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
  color: colorRef.optional(),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
