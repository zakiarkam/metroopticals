import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderQueryInput,
} from "@/features/orders/validators/order";
import {
  sendOrderConfirmationEmail,
  sendOrderNotificationToAdmin,
  sendOrderStatusUpdateEmail,
} from "@/lib/email/resend";
import type {
  OrderStatus,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  User,
} from "@prisma/client";
import {
  sendWhatsAppMessage,
  formatOrderPlacedCustomerWhatsAppMessage,
  formatOrderStatusWhatsAppMessage,
} from "@/lib/whatsapp";
import { logger, serializeError } from "@/lib/logger";
import { orderLineName } from "@/features/orders/utils/order-display";
import { canTransitionOrderStatus } from "@/features/orders/constants/status";
import { getEffectiveStock } from "@/features/products/utils/availability";
import {
  takeColorStock,
  returnColorStock,
} from "@/features/products/services/color-stock-service";
import { shopDateKey } from "@/features/pos/utils/shop-time";

type OrderWithItemsAndUser = Order & {
  // A counter line can be a service, and a product can be deleted after the
  // sale, so the relation is not guaranteed.
  items: (OrderItem & { product: Product | null })[];
  user: User | null;
};

/**
 * `25/08/2026/MO/17`  the online series, alongside `/POS/` at the counter.
 *
 * Dated in the shop's day like the counter's bills are: the server runs in
 * UTC, so an order placed at 9pm Colombo is already tomorrow there, and two
 * order numbers printed minutes apart would carry different dates.
 */
function formatOrderNumber(orderId: number, createdAt: Date): string {
  const [year, month, day] = shopDateKey(createdAt).split("-");
  return `${day}/${month}/${year}/MO/${orderId}`;
}

async function notifyOrderPlacedWhatsApp(params: {
  order: OrderWithItemsAndUser;
  orderData: Omit<CreateOrderInput, "items" | "shippingFee">;
}) {
  const { order, orderData } = params;

  const items = order.items.map((i) => ({
    product: {
      title: i.color ? `${orderLineName(i)} (${i.color})` : orderLineName(i),
    },
    quantity: i.quantity,
    price: i.price,
  }));

  const customerPhone =
    orderData.shippingPhone?.trim() ||
    orderData.billingPhone?.trim() ||
    order.user?.phone?.trim() ||
    undefined;

  // Customer confirmation
  if (customerPhone) {
    const customerMsg = formatOrderPlacedCustomerWhatsAppMessage({
      orderNumber: order.orderNumber,
      orderId: order.id,
      totalAmount: order.totalAmount,
      items,
    });

    const r = await sendWhatsAppMessage(customerPhone, customerMsg, {
      maxRetries: 1,
      retryDelayMs: 61_000,
    });

    if (!r.success && r.isInvalidNumber) {
      logger.warn(`⚠️ Customer phone not on WhatsApp: ${customerPhone}`);
    } else if (!r.success) {
      logger.warn("⚠️ Customer WhatsApp failed", { error: r.error });
    }
  } else {
    logger.warn("⚠️ No customer phone, skipping customer WhatsApp");
  }
}

export async function getOrders(
  userId: number,
  query: OrderQueryInput,
  isAdmin: boolean = false,
) {
  const { page, limit, status } = query;
  const skip = (page - 1) * limit;

  const where: any = isAdmin ? {} : { userId };

  if (status) where.status = status;
  if (query.channel && query.channel !== "ALL") where.channel = query.channel;

  // Searched here rather than in the table: filtering the page the server
  // already sent back only hides rows from the current ten, so an order on
  // page four is invisible to a search that should have found it.
  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { billingName: { contains: search, mode: "insensitive" } },
      { billingPhone: { contains: search, mode: "insensitive" } },
      { billingEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true, customerType: true },
        },
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOrderById(
  orderId: number,
  userId: number,
  isAdmin: boolean = false,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { include: { category: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
      // A counter bill's money story  what was collected, when, and how.
      payments: { orderBy: { id: "asc" } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!order) throw new NotFoundError("Order not found");

  if (!isAdmin && order.userId !== userId) {
    throw new NotFoundError("Order not found");
  }

  return order;
}

// Delivery pricing is decided here, never by the client.
const SHIPPING_FEES: Record<CreateOrderInput["shippingMethod"], number> = {
  standard: 0,
};

export async function createOrder(userId: number, data: CreateOrderInput) {
  const { items, ...orderData } = data;
  const shippingFee = SHIPPING_FEES[data.shippingMethod];

  // Validate products + compute totals
  let subtotal = 0;

  const validatedItems: Array<{
    productId: number;
    quantity: number;
    price: number;
    discountedPrice: number | null;
    color: string | null;
    currentStock: number;
  }> = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { colorStocks: { select: { color: true, stock: true } } },
    });

    if (!product) {
      throw new NotFoundError(`Product ${item.productId} not found`);
    }

    // A retired or out-of-stock product is not orderable, however the request
    // reached here  a cart left open across the retirement, or a checkout
    // posted by hand.
    if (product.status !== "ACTIVE") {
      throw new ValidationError(`${product.title} is no longer available`);
    }

    if (product.stock < item.quantity) {
      throw new ValidationError(`Insufficient stock for ${product.title}`);
    }

    const originalPrice = product.price;
    const discountedPrice =
      product.discountedPrice != null && product.discountedPrice < product.price
        ? product.discountedPrice
        : null;
    const netPrice = discountedPrice ?? originalPrice;
    subtotal += netPrice * item.quantity;

    // The colour is trusted only as far as the product's own list  a request
    // built by hand must not be able to write anything onto a picking slip.
    const requestedColor = item.color?.trim();
    const color =
      requestedColor &&
      product.frameColors.some(
        (option) =>
          option.trim().toLowerCase() === requestedColor.toLowerCase(),
      )
        ? requestedColor
        : null;

    // The colourway picked has to be on the shelf, not just the frame: a
    // cart line kept open while its colour sold out stops here, with the
    // colour named so the shopper knows another one may still be available.
    if (color) {
      const colorCeiling = getEffectiveStock(
        product.stock,
        product.colorStocks,
        color,
      );
      if (colorCeiling < item.quantity) {
        throw new ValidationError(
          colorCeiling <= 0
            ? `The ${color} colour of ${product.title} is out of stock`
            : `Only ${colorCeiling} of the ${color} colour of ${product.title} in stock`,
        );
      }
    }

    validatedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: originalPrice,
      discountedPrice,
      color,
      currentStock: product.stock,
    });
  }

  const totalAmount = subtotal + shippingFee;

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: "PENDING",
        userId,
        status: "PENDING",
        totalAmount,
        shippingFee,
        subtotal,
        ...orderData,
        items: {
          create: validatedItems.map(
            ({ productId, quantity, price, discountedPrice, color }) => ({
              productId,
              quantity,
              price,
              ...(discountedPrice !== null ? { discountedPrice } : {}),
              ...(color ? { color } : {}),
            }),
          ),
        },
      } as any,
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });

    // Update stock
    for (const item of validatedItems) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new ValidationError("Insufficient stock for one of the items");
      }

      // The colourway's own count moves with the total. Strict: on the
      // website the shopper can be told the colour just sold out and pick
      // another, so a race on the last unit fails the order honestly.
      await takeColorStock(tx, {
        productId: item.productId,
        color: item.color,
        quantity: item.quantity,
        strict: true,
      });
      await tx.product.updateMany({
        where: { id: item.productId, stock: 0 },
        data: { status: "OUT_OF_STOCK" },
      });

      // The same ledger the counter writes to, so the stock history explains
      // every movement whichever way the item was sold.
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          delta: -item.quantity,
          reason: "ONLINE_ORDER",
          orderId: newOrder.id,
        },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { userId } });

    const finalOrderNumber = formatOrderNumber(newOrder.id, newOrder.createdAt);

    return (await tx.order.update({
      where: { id: newOrder.id },
      data: { orderNumber: finalOrderNumber },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    })) as OrderWithItemsAndUser;
  },
  // A 20s budget: the default 5s is ~15 database round trips, and a dev
  // machine talking to a faraway database spends ~300ms on each one  the
  // transaction would expire mid-checkout. Production never gets close.
  { timeout: 20_000, maxWait: 10_000 });

  // Customer email
  void (async () => {
    try {
      const emailItems = order.items.map((item) => ({
        quantity: item.quantity,
        price: item.discountedPrice ?? item.price,
        color: item.color,
        product: {
          title: orderLineName(item),
          images: item.product?.images ?? [],
          catalogueFile: item.product?.catalogueFile ?? null,
        },
      }));

      await sendOrderConfirmationEmail(
        orderData.billingEmail,
        order.orderNumber,
        order.id,
        {
          billingName: orderData.billingName,
          billingEmail: orderData.billingEmail,
          shippingAddress: orderData.shippingAddress,
          shippingCity: orderData.shippingCity,
          shippingCountry: orderData.shippingCountry,
          totalAmount,
          items: emailItems,
        },
      );
    } catch (err) {
      logger.error("❌ Customer email sending error", serializeError(err));
    }
  })();

  // Admin email
  void (async () => {
    try {
      const adminEmail = process.env.ADMIN_EMAIL?.trim();
      if (!adminEmail) return;

      const emailItems = order.items.map((item) => ({
        quantity: item.quantity,
        price: item.discountedPrice ?? item.price,
        color: item.color,
        product: {
          title: orderLineName(item),
          images: item.product?.images ?? [],
          catalogueFile: item.product?.catalogueFile ?? null,
        },
      }));

      await sendOrderNotificationToAdmin(adminEmail, order.orderNumber, {
        billingName: orderData.billingName,
        billingEmail: orderData.billingEmail,
        billingPhone: orderData.billingPhone,
        totalAmount,
        items: emailItems,
        shippingAddress: orderData.shippingAddress,
        shippingCity: orderData.shippingCity,
        shippingCountry: orderData.shippingCountry,
        notes: orderData.notes,
      });
    } catch (err) {
      logger.error("❌ Admin email sending error", serializeError(err));
    }
  })();

  // WhatsApp: order placed (customer -> admin)
  void notifyOrderPlacedWhatsApp({ order, orderData }).catch((err) => {
    logger.error("❌ notifyOrderPlacedWhatsApp error", serializeError(err));
  });

  return order;
}

/**
 * Which payment row a settled online order writes.
 *
 * The order carries the customer's chosen method as the checkout wrote it;
 * the payments table speaks the counter's enum, so the two are mapped here
 * rather than guessed at the call site.
 */
function paymentMethodForOrder(paymentMethod: string | null): PaymentMethod {
  return paymentMethod === "bank_transfer" ? "BANK_TRANSFER" : "CASH";
}

export async function updateOrderStatus(
  orderId: number,
  data: UpdateOrderStatusInput,
  actorId?: number,
) {
  let previousStatus: OrderStatus | null = null;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!existingOrder) throw new NotFoundError("Order not found");

    previousStatus = existingOrder.status;

    // A counter bill is cancelled from the POS screen, which also reverses the
    // money taken and writes the reason. Cancelling it here would put the
    // stock back a second time and leave the payments standing.
    if (existingOrder.channel === "POS" && data.status === "CANCELLED") {
      throw new ValidationError(
        "Cancel a counter bill from Counter sales, so the refund and the stock are handled together.",
      );
    }

    // Cancelling put the goods back on the shelf. Re-opening the order would
    // not take them off again, so the count would drift by one order every
    // time someone toggled the status  and a re-opened counter bill would go
    // back to counting as revenue while its receipt still said "cancelled".
    if (existingOrder.status === "CANCELLED" && data.status !== "CANCELLED") {
      throw new ValidationError(
        "A cancelled order cannot be re-opened. Take the new sale as its own order.",
      );
    }

    // Every other step an order can take. Going backwards would email the
    // customer the same news twice in the wrong order, and jumping straight
    // to delivered would skip the moment the money is collected.
    if (!canTransitionOrderStatus(existingOrder.status, data.status)) {
      throw new ValidationError(
        `An order that is ${existingOrder.status} cannot be marked ${data.status}.`,
      );
    }

    const shouldRestock =
      existingOrder.status !== "CANCELLED" &&
      !existingOrder.voidedAt &&
      data.status === "CANCELLED";

    if (shouldRestock) {
      for (const item of existingOrder.items) {
        // A service line has no product, and anything already returned is
        // back on the shelf  putting it back again would inflate the count.
        if (item.productId == null) continue;
        const putBack = item.quantity - item.returnedQty;
        if (putBack <= 0) continue;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: putBack } },
        });
        // The units go back onto the colourway they were sold from.
        await returnColorStock(tx, {
          productId: item.productId,
          color: item.color,
          quantity: putBack,
        });
        await tx.product.updateMany({
          where: { id: item.productId, stock: { gt: 0 }, status: "OUT_OF_STOCK" },
          data: { status: "ACTIVE" },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            delta: putBack,
            reason: "VOID",
            orderId: orderId,
            note: "Order cancelled",
          },
        });
      }
    }

    // Cash on delivery is collected at the door, and a bank transfer has
    // cleared by the time the parcel goes out. Marking the order delivered is
    // therefore the moment the money is in: without a payment row the day's
    // takings would show the sale as never paid for.
    const outstanding =
      Math.round((existingOrder.totalAmount - existingOrder.amountPaid) * 100) /
      100;
    const settlesBalance =
      data.status === "DELIVERED" &&
      existingOrder.channel === "ONLINE" &&
      outstanding > 0.005;

    if (settlesBalance) {
      await tx.payment.create({
        data: {
          orderId,
          method: paymentMethodForOrder(existingOrder.paymentMethod),
          amount: outstanding,
          reference: "Collected on delivery",
          createdById: actorId ?? null,
        },
      });
    }

    return await tx.order.update({
      where: { id: orderId },
      data: {
        status: data.status,
        ...(shouldRestock ? { voidedAt: new Date() } : {}),
        ...(settlesBalance
          ? {
              amountPaid: existingOrder.totalAmount,
              paymentStatus: "PAID" as const,
            }
          : {}),
      },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });
  }, { timeout: 20_000, maxWait: 10_000 });

  const statusHasChanged =
    previousStatus !== null && previousStatus !== data.status;

  // Every step a customer cares about, not only the last two. Confirmation
  // is the moment their prescription was accepted, which is the one they
  // are waiting to hear.
  const notifyStatuses: Array<OrderStatus> = [
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];
  const shouldNotify = notifyStatuses.includes(data.status) && statusHasChanged;

  if (
    shouldNotify &&
    (data.status === "CONFIRMED" ||
      data.status === "SHIPPED" ||
      data.status === "DELIVERED" ||
      data.status === "CANCELLED")
  ) {
    // Email
    const recipientEmail =
      updatedOrder.shippingEmail?.trim() || updatedOrder.user?.email?.trim();
    const recipientName =
      updatedOrder.shippingName?.trim() || updatedOrder.user?.name?.trim();

    if (recipientEmail) {
      void (async () => {
        try {
          await sendOrderStatusUpdateEmail({
            email: recipientEmail,
            name: recipientName,
            orderNumber: updatedOrder.orderNumber,
            status: data.status as "SHIPPED" | "CANCELLED",
          });
        } catch (err) {
          logger.error(
            "Order status email notification error",
            serializeError(err),
          );
        }
      })();
    } else {
      logger.warn("Skipping status email: recipient email missing");
    }

    // WhatsApp
    const recipientPhone =
      updatedOrder.shippingPhone?.trim() || updatedOrder.user?.phone?.trim();

    if (recipientPhone) {
      const statusForWhatsApp = data.status as "SHIPPED" | "CANCELLED";
      void (async () => {
        try {
          const msg = formatOrderStatusWhatsAppMessage({
            orderNumber: updatedOrder.orderNumber,
            orderId: updatedOrder.id,
            status: statusForWhatsApp,
            totalAmount: updatedOrder.totalAmount,
          });

          await sendWhatsAppMessage(recipientPhone, msg);
        } catch (err) {
          logger.error(
            "WhatsApp status notification error",
            serializeError(err),
          );
        }
      })();
    }
  }

  return updatedOrder;
}
