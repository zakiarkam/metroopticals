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
  Product,
  User,
} from "@prisma/client";
import {
  sendWhatsAppMessage,
  formatOrderPlacedCustomerWhatsAppMessage,
  formatOrderPlacedAdminWhatsAppMessage,
  formatOrderStatusWhatsAppMessage,
} from "@/lib/whatsapp";
import { logger, serializeError } from "@/lib/logger";

type OrderWithItemsAndUser = Order & {
  items: (OrderItem & { product: Product })[];
  user: User | null;
};

function formatOrderNumber(orderId: number, createdAt: Date): string {
  const day = String(createdAt.getDate()).padStart(2, "0");
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  const year = createdAt.getFullYear();
  return `${day}/${month}/${year}/SAMH/${orderId}`;
}

/**
 * WhatsApp notifier for ORDER PLACED (customer first, then admin).
 * - No manual sleep here.
 * - If admin hits rate-limit, sendWhatsAppMessage() handles 429 retry/wait internally.
 */
async function notifyOrderPlacedWhatsApp(params: {
  order: OrderWithItemsAndUser;
  orderData: Omit<CreateOrderInput, "items" | "shippingFee">;
}) {
  const { order, orderData } = params;

  const items = order.items.map((i) => ({
    product: { title: i.product.title },
    quantity: i.quantity,
    price: i.price,
  }));

  const customerPhone =
    orderData.shippingPhone?.trim() ||
    orderData.billingPhone?.trim() ||
    order.user?.phone?.trim() ||
    undefined;

  // 1) Customer confirmation (priority)
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

  // 2) Admin notification
  // const adminPhone = process.env.ADMIN_PHONE?.trim();
  // if (adminPhone) {
  //   const adminMsg = formatOrderPlacedAdminWhatsAppMessage({
  //     orderNumber: order.orderNumber,
  //     orderId: order.id,
  //     billingName: orderData.billingName,
  //     billingEmail: orderData.billingEmail,
  //     customerPhone,
  //     totalAmount: order.totalAmount,
  //     items,
  //     shippingAddress: orderData.shippingAddress,
  //     shippingCity: orderData.shippingCity,
  //     shippingCountry: orderData.shippingCountry,
  //     notes: orderData.notes ?? undefined,
  //   });

  //   const r = await sendWhatsAppMessage(adminPhone, adminMsg, {
  //     maxRetries: 2,
  //     retryDelayMs: 61_000,
  //   });

  //   if (!r.success && r.isInvalidNumber) {
  //     console.warn(`⚠️ Admin phone not on WhatsApp: ${adminPhone}`);
  //   } else if (!r.success) {
  //     console.warn("⚠️ Admin WhatsApp failed:", r.error);
  //   }
  // } else {
  //   console.warn("⚠️ ADMIN_PHONE not configured, skipping admin WhatsApp");
  // }
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
    },
  });

  if (!order) throw new NotFoundError("Order not found");

  if (!isAdmin && order.userId !== userId) {
    throw new NotFoundError("Order not found");
  }

  return order;
}

export async function createOrder(userId: number, data: CreateOrderInput) {
  const { items, shippingFee, ...orderData } = data;

  // Validate products + compute totals
  let subtotal = 0;

  const validatedItems: Array<{
    productId: number;
    quantity: number;
    price: number;
    discountedPrice: number | null;
    currentStock: number;
  }> = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product) {
      throw new NotFoundError(`Product ${item.productId} not found`);
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

    validatedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: originalPrice,
      discountedPrice,
      currentStock: product.stock,
    });
  }

  const totalAmount = subtotal + (shippingFee || 0);

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: "PENDING",
        userId,
        status: "PENDING",
        totalAmount,
        shippingFee: shippingFee || 0,
        subtotal,
        ...orderData,
        items: {
          create: validatedItems.map(
            ({ productId, quantity, price, discountedPrice }) => ({
              productId,
              quantity,
              price,
              ...(discountedPrice !== null ? { discountedPrice } : {}),
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
      const newStock = item.currentStock - item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          ...(newStock === 0 ? { status: "OUT_OF_STOCK" } : {}),
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
  });

  /**
   * Notifications (best-effort):
   * - We do not block order creation for external services.
   * - On VPS/Node this is fine. (If you ever move to serverless, use a queue/job worker.)
   */

  // Customer email
  void (async () => {
    try {
      const emailItems = order.items.map((item) => ({
        quantity: item.quantity,
        price: item.price,
        product: {
          title: item.product.title,
          images: item.product.images,
          catalogueFile: item.product.catalogueFile,
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
        price: item.price,
        product: {
          title: item.product.title,
          images: item.product.images,
          catalogueFile: item.product.catalogueFile,
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

export async function updateOrderStatus(
  orderId: number,
  data: UpdateOrderStatusInput,
) {
  let previousStatus: OrderStatus | null = null;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!existingOrder) throw new NotFoundError("Order not found");

    previousStatus = existingOrder.status;

    const shouldRestock =
      existingOrder.status !== "CANCELLED" && data.status === "CANCELLED";

    if (shouldRestock) {
      for (const item of existingOrder.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return await tx.order.update({
      where: { id: orderId },
      data: { status: data.status },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    });
  });

  const statusHasChanged =
    previousStatus !== null && previousStatus !== data.status;

  const notifyStatuses: Array<OrderStatus> = ["SHIPPED", "CANCELLED"];
  const shouldNotify = notifyStatuses.includes(data.status) && statusHasChanged;

  if (
    shouldNotify &&
    (data.status === "SHIPPED" || data.status === "CANCELLED")
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
