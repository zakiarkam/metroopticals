/**
 * How a storefront order is paid for, and how it reaches the customer.
 *
 * Shared by the checkout form, the order validator and the order service, so
 * the three cannot drift apart: a method the form can offer is a method the
 * server will accept, and nothing else.
 */

export const PAYMENT_METHODS = ["cod", "bank_transfer", "payhere"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

/** `standard` is island-wide delivery; `pickup` is collection at the shop. */
export const FULFILMENT_METHODS = ["standard", "pickup"] as const;
export type FulfilmentMethodValue = (typeof FULFILMENT_METHODS)[number];

/** The only method that leaves the site to be paid for. */
export const ONLINE_PAYMENT_METHOD: PaymentMethodValue = "payhere";

export const isOnlinePayment = (method: string | null | undefined) =>
  method === ONLINE_PAYMENT_METHOD;

export const isPickup = (shippingMethod: string | null | undefined) =>
  shippingMethod === "pickup";
