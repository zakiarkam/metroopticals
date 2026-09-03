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

/**
 * Fitting lenses to a frame already in the basket, or taking them off again.
 *
 * The price is not in here on purpose: it is re-quoted on the server from the
 * live price list, so a basket left open across a price change cannot buy at
 * the old price and a hand-built request cannot name its own.
 */
export const setCartItemLensSchema = z.object({
  lensTypeId: z.coerce.number().int().positive().nullable(),
  /** Which build — single vision, bifocal, progressive. */
  lensDesignId: z.coerce.number().int().positive().nullable().optional(),
  lensTintId: z.coerce.number().int().positive().nullable().optional(),
  prescriptionId: z.coerce.number().int().positive().nullable().optional(),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type SetCartItemLensInput = z.infer<typeof setCartItemLensSchema>
