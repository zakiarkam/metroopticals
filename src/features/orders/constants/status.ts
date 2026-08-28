import type { OrderStatus } from "@/features/orders/types/order";

/**
 * Which status an order may move to next.
 *
 * The status is not a free-form label: stock, refunds and the customer's
 * notifications all hang off it. Without a map like this an order could go
 * from DELIVERED back to PENDING, or from SHIPPED straight to CONFIRMED, and
 * the customer would be emailed each way round. Delivered and cancelled are
 * both ends of the line  a delivered order that comes back is a return, and
 * a cancelled one is re-taken as a new order.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  // DELIVERED is reachable straight from PROCESSING because a counter bill
  // written as "collect later" sits there until the customer walks in for it:
  // nothing is ever shipped, so it would otherwise have no way to finish.
  PROCESSING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Whether `next` is a step the order is allowed to take from `current`. */
export const canTransitionOrderStatus = (
  current: OrderStatus,
  next: OrderStatus,
): boolean =>
  current === next || ORDER_STATUS_TRANSITIONS[current].includes(next);
