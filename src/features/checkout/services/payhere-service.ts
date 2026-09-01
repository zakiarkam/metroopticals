import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import { isOnlinePayment } from "@/features/checkout/constants/payment";
import {
  sendOrderPlacedNotifications,
  updateOrderStatus,
} from "@/features/orders/services/order-service";
import { orderLineName } from "@/features/orders/utils/order-display";
import {
  PAYHERE_CURRENCY,
  PAYHERE_STATUS,
  buildPayHereCheckout,
  formatPayHereAmount,
  payhereCancelUrl,
  payhereNotifyUrl,
  payhereReturnUrl,
  type PayHereCheckout,
  type PayHereNotification,
} from "@/lib/payments/payhere";

const ORDER_WITH_LINES = {
  items: { include: { product: true } },
  user: true,
} satisfies Prisma.OrderInclude;

/**
 * The signed form that sends one order to PayHere.
 *
 * Every guard here is about the same thing: a customer may only start a
 * payment for their own, still-open, card order. The amount comes from the
 * order row, so what the gateway is asked for is what the shop recorded — the
 * browser has no say in it and never sees the merchant secret.
 */
export async function startPayHerePayment(
  orderId: number,
  userId: number,
): Promise<PayHereCheckout> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  // Same answer for "no such order" and "not yours": whether an order id
  // exists is not something a stranger gets to learn by guessing.
  if (!order || order.userId !== userId) {
    throw new NotFoundError("Order not found");
  }

  if (order.channel !== "ONLINE" || !isOnlinePayment(order.paymentMethod)) {
    throw new ValidationError("This order is not paid for online.");
  }

  if (order.paymentStatus === "PAID") {
    throw new ValidationError("This order has already been paid.");
  }

  if (order.status === "CANCELLED" || order.voidedAt) {
    throw new ValidationError(
      "This order was cancelled. Please place it again.",
    );
  }

  if (!(order.totalAmount > 0)) {
    throw new ValidationError("This order has nothing to pay.");
  }

  // PayHere validates these two and refuses the payment outright if either is
  // blank — better to fail here, on our own page, than after the customer has
  // been thrown out to a gateway error screen.
  if (!order.billingEmail?.trim() || !order.billingPhone?.trim()) {
    throw new ValidationError(
      "This order needs an email address and a phone number before it can be paid online.",
    );
  }

  const firstLine = order.items[0];
  const extra = order.items.length - 1;
  const description = firstLine
    ? `${orderLineName(firstLine)}${extra > 0 ? ` + ${extra} more` : ""}`
    : `Order ${order.orderNumber}`;

  return buildPayHereCheckout({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    itemsDescription: description,
    customer: {
      name: order.billingName,
      email: order.billingEmail ?? "",
      phone: order.billingPhone,
      address: order.billingAddress,
      city: order.billingCity,
      country: order.billingCountry || "Sri Lanka",
    },
    delivery: {
      address: order.shippingAddress,
      city: order.shippingCity,
      country: order.shippingCountry || "Sri Lanka",
    },
    returnUrl: payhereReturnUrl(order.id),
    cancelUrl: payhereCancelUrl(order.id),
    notifyUrl: payhereNotifyUrl(),
  });
}

export type PayHereOutcome =
  | "paid"
  | "already_paid"
  | "duplicate"
  | "pending"
  | "cancelled"
  | "chargeback"
  | "ignored";

/**
 * Applies an already-authenticated PayHere callback to the order it names.
 *
 * The signature was checked before this ran; what is checked here is that the
 * *message matches the bill* — same currency, same amount to the cent. A
 * genuine notification for the wrong money is still not permission to mark an
 * order paid.
 */
export async function applyPayHereNotification(
  notification: PayHereNotification,
): Promise<{ outcome: PayHereOutcome; orderId: number }> {
  const orderId = Number.parseInt(notification.orderId, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new NotFoundError("Order not found");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_WITH_LINES,
  });

  if (!order) throw new NotFoundError("Order not found");

  if (notification.currency !== PAYHERE_CURRENCY) {
    throw new ValidationError(
      `Currency mismatch: gateway sent ${notification.currency}`,
    );
  }

  // Compared as the exact string that was signed, not as a rounded number.
  // The verifier has already pinned the amount to `1234.00` shape, so there
  // is no formatting variance left to be tolerant of — and tolerance is
  // precisely what a boundary-shifted message needs to slip through.
  const expectedAmount = formatPayHereAmount(order.totalAmount);
  if (notification.amount !== expectedAmount) {
    throw new ValidationError(
      `Amount mismatch on order ${order.orderNumber}: gateway sent ${notification.amount}, order is ${expectedAmount}`,
    );
  }

  switch (notification.statusCode) {
    case PAYHERE_STATUS.SUCCESS:
      return { outcome: await settlePaidOrder(order, notification), orderId };

    case PAYHERE_STATUS.PENDING:
      // eZ Cash and bank instructions settle later. The order waits: it is
      // neither paid for nor abandoned, and its stock stays reserved.
      logger.info("PayHere payment pending", {
        orderNumber: order.orderNumber,
        paymentId: notification.paymentId,
      });
      return { outcome: "pending", orderId };

    case PAYHERE_STATUS.CHARGEDBACK:
      // Money that was taken has been pulled back. This is a dispute, not a
      // cancellation: stock is not returned automatically and the shop is
      // told, loudly, so a person decides what happens to the goods.
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "REFUNDED" },
      });
      logger.error("PayHere chargeback received", {
        orderNumber: order.orderNumber,
        paymentId: notification.paymentId,
        amount: notification.amount,
      });
      return { outcome: "chargeback", orderId };

    case PAYHERE_STATUS.CANCELED:
    case PAYHERE_STATUS.FAILED: {
      // A failure that arrives after the bill was settled is not authority to
      // unwind it — that would be a free way to cancel a paid order.
      if (order.paymentStatus === "PAID") {
        logger.warn("PayHere failure ignored on an already-paid order", {
          orderNumber: order.orderNumber,
          statusCode: notification.statusCode,
        });
        return { outcome: "ignored", orderId };
      }

      if (order.status === "CANCELLED") return { outcome: "cancelled", orderId };

      // Cancelling through the normal path puts the stock back, writes the
      // ledger entry and tells the customer, exactly as an admin cancellation
      // would. Their cart was never emptied, so they can simply try again.
      await updateOrderStatus(order.id, { status: "CANCELLED" });
      logger.warn("PayHere payment not completed; order cancelled", {
        orderNumber: order.orderNumber,
        statusCode: notification.statusCode,
        statusMessage: notification.statusMessage,
      });
      return { outcome: "cancelled", orderId };
    }

    default:
      logger.warn("Unknown PayHere status code", {
        orderNumber: order.orderNumber,
        statusCode: notification.statusCode,
      });
      return { outcome: "ignored", orderId };
  }
}

type OrderWithLines = Prisma.OrderGetPayload<{ include: typeof ORDER_WITH_LINES }>;

/**
 * Records a successful charge, once.
 *
 * PayHere retries its callback until it is acknowledged, so this has to be
 * safe to run twice. The unique index on `gatewayPaymentId` is what makes it
 * so: the second attempt loses the race at the database rather than at a
 * read-then-write check that two concurrent deliveries would both pass.
 */
async function settlePaidOrder(
  order: OrderWithLines,
  notification: PayHereNotification,
): Promise<PayHereOutcome> {
  if (order.paymentStatus === "PAID") return "already_paid";

  // A bill whose money was pulled back is settled by a person, not by another
  // callback. `payment_id` is outside the signature, so a captured success
  // message can be replayed with a fresh one — and the one moment that would
  // do real harm is here, silently turning a chargeback back into a sale and
  // burying the alert that was raised for it.
  if (order.paymentStatus === "REFUNDED") {
    logger.error("PayHere success ignored on a charged-back order", {
      orderNumber: order.orderNumber,
      paymentId: notification.paymentId,
    });
    return "ignored";
  }

  try {
    const settled = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: "ONLINE",
          amount: order.totalAmount,
          reference: notification.method
            ? `PayHere ${notification.method} · ${notification.paymentId}`
            : `PayHere · ${notification.paymentId}`,
          gatewayPaymentId: notification.paymentId,
        },
      });

      // A cancelled order that then reports a successful payment is a refund
      // problem for a person, not something to quietly re-open: the stock has
      // already gone back on the shelf.
      const nextStatus = order.status === "PENDING" ? "CONFIRMED" : order.status;

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          amountPaid: order.totalAmount,
          paymentStatus: "PAID",
          status: nextStatus,
        },
        include: ORDER_WITH_LINES,
      });

      // Now that the money is in, take the lines that were bought out of the
      // basket — and only those, so anything added while the customer was on
      // the gateway is still waiting for them.
      const boughtLines = order.items
        .filter((item) => item.productId != null)
        .map((item) => ({
          productId: item.productId as number,
          color: item.color ?? "",
        }));

      if (order.userId && boughtLines.length) {
        await tx.cartItem.deleteMany({
          where: { userId: order.userId, OR: boughtLines },
        });
      }

      return updated;
    });

    if (order.status === "CANCELLED") {
      logger.error("PayHere paid an order that was already cancelled", {
        orderNumber: order.orderNumber,
        paymentId: notification.paymentId,
      });
    }

    // The customer's receipt and the shop's copy, held back at checkout
    // precisely until this moment.
    sendOrderPlacedNotifications(settled);
    logger.info("PayHere payment settled", {
      orderNumber: settled.orderNumber,
      paymentId: notification.paymentId,
      amount: notification.amount,
    });
    return "paid";
  } catch (error) {
    // P2002 on `gatewayPaymentId`: this exact payment was already recorded by
    // an earlier delivery of the same callback. Nothing to do, and nothing
    // wrong — acknowledge it so the gateway stops retrying.
    if (
      error &&
      typeof error === "object" &&
      (error as { code?: string }).code === "P2002"
    ) {
      return "duplicate";
    }
    logger.error("PayHere settlement failed", serializeError(error));
    throw error;
  }
}
