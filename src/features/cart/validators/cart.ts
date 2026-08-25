import { z } from 'zod'

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
