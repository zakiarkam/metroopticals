import { z } from 'zod'

export const addToCartSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be positive'),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>


