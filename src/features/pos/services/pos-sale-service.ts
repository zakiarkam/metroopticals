import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type {
  AddPaymentInput,
  CreateSaleInput,
  ReturnSaleInput,
  SaleQueryInput,
  VoidSaleInput,
} from "@/features/pos/validators/pos";
import {
  calculateBillTotals,
  lineDiscountApplied,
  lineNet,
  resolvePaymentStatus,
  roundMoney,
} from "@/features/pos/utils/bill";
import {
  shopDateKey,
  shopDayStart,
  shopRange,
} from "@/features/pos/utils/shop-time";
import {
  normalisePhone,
  resolveCustomerForSale,
} from "@/features/pos/services/pos-customer-service";
import { WALK_IN_CUSTOMER } from "@/features/orders/utils/order-display";
import {
  takeColorStock,
  returnColorStock,
} from "@/features/products/services/color-stock-service";

/** Everything a receipt or a sale detail panel needs, in one shape. */
const saleInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
          images: true,
          unitType: true,
          stock: true,
        },
      },
    },
    orderBy: { id: "asc" },
  },
  payments: {
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  },
  customer: true,
  createdBy: { select: { id: true, name: true, email: true } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

export type SaleWithDetail = Prisma.OrderGetPayload<{
  include: typeof saleInclude;
}>;

/**
 * `25/08/2026/POS/17`  the counter's own series, alongside `/MO/` online.
 *
 * Dated in the shop's day, not the server's: a sale rung up at 9pm Colombo is
 * already tomorrow in UTC, and a bill whose printed date disagreed with the
 * day's report would be impossible to reconcile.
 */
function formatBillNumber(orderId: number, createdAt: Date): string {
  const [year, month, day] = shopDateKey(createdAt).split("-");
  return `${day}/${month}/${year}/POS/${orderId}`;
}

/**
 * What the `paymentMethod` column says for a counter bill. The column predates
 * the payments table and is still what the orders list shows, so it carries
 * the single method when there is one and `MIXED` when the bill was split.
 */
function summarisePaymentMethod(methods: string[]): string | null {
  const unique = Array.from(new Set(methods));
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return "MIXED";
}

type PricedLine = {
  productId: number | null;
  title: string;
  quantity: number;
  /** The catalogue's own unit price, kept even when the cashier charged less. */
  cataloguePrice: number;
  unitPrice: number;
  lineDiscount: number;
  color: string | null;
  net: number;
};

/**
 * Turn the cashier's lines into priced lines.
 *
 * The price on the request is trusted as an override  the counter is allowed
 * to give a discount  but everything else about the product comes from the
 * database, and a product that is missing or inactive stops the sale here
 * rather than at the stock update.
 */
async function priceLines(
  input: CreateSaleInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PricedLine[]> {
  const productIds = Array.from(
    new Set(
      input.items
        .map((item) => item.productId)
        .filter((id): id is number => id != null),
    ),
  );

  const products = productIds.length
    ? await client.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));

  return input.items.map((item) => {
    if (item.productId == null) {
      // A service line: a fitting, an eye test, a repair.
      const unitPrice = roundMoney(item.unitPrice);
      const line = {
        quantity: item.quantity,
        unitPrice,
        lineDiscount: item.lineDiscount,
      };
      return {
        productId: null,
        title: item.title!.trim(),
        quantity: item.quantity,
        cataloguePrice: unitPrice,
        unitPrice,
        // Clamped to the line itself. Stored unclamped it would print a
        // negative line, and returning that line would make the bill grow.
        lineDiscount: lineDiscountApplied(line),
        color: null,
        net: lineNet(line),
      };
    }

    const product = byId.get(item.productId);
    if (!product) {
      throw new NotFoundError(
        `Product ${item.productId} is no longer available`,
      );
    }
    if (product.status === "INACTIVE") {
      throw new ValidationError(`${product.title} is not available for sale`);
    }

    const unitPrice = roundMoney(item.unitPrice);
    const line = {
      quantity: item.quantity,
      unitPrice,
      lineDiscount: item.lineDiscount,
    };

    // The colour is trusted only as far as the product's own list, so a
    // hand-built request cannot print anything it likes on a bill.
    const requested = item.color?.trim();
    const color =
      requested &&
      product.frameColors.some(
        (option) => option.trim().toLowerCase() === requested.toLowerCase(),
      )
        ? requested
        : null;

    return {
      productId: product.id,
      title: product.title,
      quantity: item.quantity,
      cataloguePrice: product.price,
      unitPrice,
      lineDiscount: lineDiscountApplied(line),
      color,
      net: lineNet(line),
    };
  });
}

/**
 * Write a bill at the counter.
 *
 * Stock, the sale, its payments and the stock ledger all move together or not
 * at all: a bill that printed but did not take the frames off the shelf is
 * worse than a sale that failed and can be rung up again.
 */
export async function createSale(input: CreateSaleInput, cashierId: number) {
  const lines = await priceLines(input);

  const totals = calculateBillTotals({
    items: lines.map((line) => ({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineDiscount: line.lineDiscount,
    })),
    discountAmount: input.discountAmount,
    amountPaid: input.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    ),
  });

  // A bill that comes to nothing is allowed on purpose: a warranty
  // replacement or a frame swapped under guarantee still has to leave the
  // shelf and still needs a bill number the customer can bring back.

  // A zero-rupee payment row is not a payment; it would only inflate the
  // count of card swipes in the day's report.
  const payments = input.payments.filter((payment) => payment.amount > 0);

  const paid = roundMoney(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  if (paid > totals.totalAmount + 0.01) {
    throw new ValidationError(
      "Payments are more than the bill total. Record the change given instead of over-paying the bill.",
    );
  }

  const balance = roundMoney(totals.totalAmount - paid);

  // Someone who owes money has to be findable afterwards, and a name with no
  // phone number is not. A customer picked out of the book already has one.
  const canBeChased =
    !!input.customer?.id || !!normalisePhone(input.customer?.phone ?? "");
  if (balance > 0.01 && !canBeChased) {
    throw new ValidationError(
      "A bill with a balance to collect needs the customer's name and phone number.",
    );
  }

  const paymentStatus = resolvePaymentStatus(totals.totalAmount, paid);
  // Only a bill that is actually leaving money behind carries a promise date.
  const balanceDueDate =
    balance > 0.01 && input.balanceDueDate
      ? shopDayStart(input.balanceDueDate)
      : null;

  return prisma.$transaction(
    async (tx) => {
      // Inside the transaction: a bill that fails on stock must not leave a new
      // customer behind in the book.
      const customer = await resolveCustomerForSale(input.customer, tx);
      const billingName = customer?.name ?? WALK_IN_CUSTOMER;
      const billingPhone = customer?.phone ?? "";

      const created = await tx.order.create({
        data: {
          orderNumber: `POS-PENDING-${cashierId}-${Date.now()}`,
          channel: "POS",
          // Goods handed over at the counter are done; a job the customer will
          // come back for stays in progress until they collect it.
          status: input.collectLater ? "PROCESSING" : "DELIVERED",
          paymentStatus,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          shippingFee: 0,
          totalAmount: totals.totalAmount,
          amountPaid: paid,
          balanceDueDate,
          paymentMethod: summarisePaymentMethod(
            payments.map((payment) => payment.method),
          ),
          notes: input.notes || null,
          billingName,
          billingEmail: customer?.email || null,
          billingPhone,
          billingAddress: customer?.address || null,
          billingCity: customer?.city || null,
          customerId: customer?.id ?? null,
          createdById: cashierId,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              title: line.title,
              quantity: line.quantity,
              price: line.cataloguePrice,
              // The unit price the cashier actually charged. The line discount
              // is NOT folded in here: dividing it back out per unit cannot
              // represent, say, Rs 100 off three items without leaving a cent
              // adrift, and a bill whose lines do not add up to its total is
              // worse than useless at a counter.
              discountedPrice:
                line.unitPrice === line.cataloguePrice ? null : line.unitPrice,
              lineDiscount: line.lineDiscount,
              color: line.color,
            })),
          },
        },
      });

      for (const line of lines) {
        if (line.productId == null) continue;

        // Guarded update: two tills selling the last frame at once cannot both
        // succeed, because the second one matches no row.
        const updated = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count === 0) {
          throw new ValidationError(
            `${line.title} does not have enough stock left`,
          );
        }

        // Strict, same as the website: a colourway's count cannot go below
        // zero even from a stale till screen. When the shelf disagrees with
        // the book, the cashier's escape hatch is adding the line without a
        // colour; the count is then corrected from the products page.
        await takeColorStock(tx, {
          productId: line.productId,
          color: line.color,
          quantity: line.quantity,
          strict: true,
        });

        await tx.product.updateMany({
          where: { id: line.productId, stock: { lte: 0 } },
          data: { status: "OUT_OF_STOCK" },
        });

        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            delta: -line.quantity,
            reason: "SALE",
            orderId: created.id,
            createdById: cashierId,
          },
        });
      }

      if (payments.length > 0) {
        await tx.payment.createMany({
          data: payments.map((payment) => ({
            orderId: created.id,
            method: payment.method,
            amount: roundMoney(payment.amount),
            reference: payment.reference || null,
            createdById: cashierId,
          })),
        });
      }

      return tx.order.update({
        where: { id: created.id },
        data: { orderNumber: formatBillNumber(created.id, created.createdAt) },
        include: saleInclude,
      });
    },
    // Three statements per product line, so a long bill on a slow connection
    // needs more than the 5s default.
    { timeout: 20_000 },
  );
}

export async function getSaleById(id: number): Promise<SaleWithDetail> {
  const sale = await prisma.order.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw new NotFoundError("Bill not found");
  return sale;
}

export async function getSales(query: SaleQueryInput) {
  const { page, limit } = query;
  const where: Prisma.OrderWhereInput = {};

  if (query.channel !== "ALL") where.channel = query.channel;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.outstandingOnly) {
    where.paymentStatus = { in: ["PENDING", "PARTIAL"] };
    where.status = { not: "CANCELLED" };
  }
  if (query.status) where.status = query.status;
  if (query.cashierId) where.createdById = query.cashierId;
  if (query.paymentMethod) {
    where.payments = { some: { method: query.paymentMethod } };
  }

  if (query.startDate || query.endDate) {
    const { start, end } = shopRange(
      query.startDate || query.endDate!,
      query.endDate || query.startDate!,
    );
    where.createdAt = { gte: start, lt: end };
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { billingName: { contains: search, mode: "insensitive" } },
      { billingPhone: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [sales, total, totals] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true, quantity: true, title: true } },
        customer: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        payments: { select: { id: true, method: true, amount: true } },
      },
      // Chasing money is ordered by who has been owing longest; everything
      // else reads newest first.
      orderBy: query.outstandingOnly
        ? [{ balanceDueDate: "asc" }, { createdAt: "asc" }]
        : { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
    // Totals for the whole filter, not just the page on screen  the counter
    // wants "what did we take today", which page 1 of 3 cannot answer.
    // Cancelled bills are left out unless they are what was asked for, and the
    // spread has to come first or a status filter would be overwritten here
    // and the summary would describe a different set of bills than the table.
    prisma.order.aggregate({
      where: query.status ? where : { ...where, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true, amountPaid: true },
    }),
  ]);

  const billed = roundMoney(totals._sum.totalAmount || 0);
  const collected = roundMoney(totals._sum.amountPaid || 0);

  return {
    sales,
    summary: {
      billed,
      collected,
      outstanding: roundMoney(Math.max(0, billed - collected)),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Settle part or all of an outstanding balance.
 *
 * The balance is checked and moved in one guarded write: two tills collecting
 * against the same bill at the same moment would otherwise both read the old
 * balance, both write their own total, and one of the two payments would
 * vanish from the bill while staying in the drawer.
 */
export async function addSalePayment(
  saleId: number,
  input: AddPaymentInput,
  cashierId: number,
) {
  const amount = roundMoney(input.amount);

  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.order.findUnique({
        where: { id: saleId },
        select: {
          id: true,
          totalAmount: true,
          amountPaid: true,
          voidedAt: true,
        },
      });
      if (!sale) throw new NotFoundError("Bill not found");
      if (sale.voidedAt) {
        throw new ValidationError(
          "This bill was cancelled and cannot take payments",
        );
      }

      const outstanding = roundMoney(sale.totalAmount - sale.amountPaid);
      // The same tolerance the payment status uses, so a bill can never be left
      // showing a one-cent balance that the till then refuses to take.
      if (outstanding <= 0.005) {
        throw new ValidationError("This bill is already settled");
      }
      if (amount > outstanding + 0.01) {
        throw new ValidationError(
          `That is more than the balance of Rs ${outstanding.toFixed(2)}`,
        );
      }

      // Compare and swap: the update only matches while the bill still has room
      // for this payment, and the increment is computed by the database.
      const moved = await tx.order.updateMany({
        where: {
          id: saleId,
          voidedAt: null,
          // Both halves of the balance are pinned: a return landing in between
          // lowers the total, and without this the payment would be measured
          // against a bill that no longer exists.
          totalAmount: sale.totalAmount,
          amountPaid: { lte: roundMoney(sale.totalAmount - amount) + 0.005 },
        },
        data: { amountPaid: { increment: amount } },
      });
      if (moved.count === 0) {
        throw new ValidationError(
          "Someone else collected against this bill just now. Open it again to see the balance.",
        );
      }

      await tx.payment.create({
        data: {
          orderId: saleId,
          method: input.method,
          amount,
          reference: input.reference || null,
          createdById: cashierId,
        },
      });

      const [current, methods] = await Promise.all([
        tx.order.findUniqueOrThrow({
          where: { id: saleId },
          select: { totalAmount: true, amountPaid: true },
        }),
        tx.payment.findMany({
          where: { orderId: saleId, amount: { gt: 0 } },
          select: { method: true },
        }),
      ]);

      const stillOwed = roundMoney(current.totalAmount - current.amountPaid);

      return tx.order.update({
        where: { id: saleId },
        data: {
          paymentStatus: resolvePaymentStatus(
            current.totalAmount,
            current.amountPaid,
          ),
          paymentMethod: summarisePaymentMethod(
            methods.map((row) => row.method),
          ),
          // Settled bills stop being chased; a part payment can move the promise
          // date to whenever the customer says they will bring the rest.
          balanceDueDate:
            stillOwed <= 0.005
              ? null
              : input.balanceDueDate
                ? shopDayStart(input.balanceDueDate)
                : undefined,
        },
        include: saleInclude,
      });
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/**
 * Cancel a bill written by mistake.
 *
 * The row is kept and marked, never deleted: the bill number was printed and
 * handed to someone, and the audit trail has to explain where it went. Stock
 * that had not already come back through a return goes back on the shelf.
 *
 * The cancellation is claimed first, with a guarded write. Two admins hitting
 * cancel on the same bill would otherwise both see it as live and both put the
 * same frames back on the shelf, leaving stock permanently overstated.
 */
export async function voidSale(
  saleId: number,
  input: VoidSaleInput,
  adminId: number,
) {
  return prisma.$transaction(
    async (tx) => {
      const sale = await tx.order.findUnique({
        where: { id: saleId },
        select: { id: true, channel: true, voidedAt: true, status: true },
      });
      if (!sale) throw new NotFoundError("Bill not found");
      if (sale.voidedAt || sale.status === "CANCELLED") {
        throw new ValidationError("This bill is already cancelled");
      }
      if (sale.channel !== "POS") {
        throw new ValidationError(
          "Only counter bills are cancelled here. Change a website order from the Orders screen.",
        );
      }

      const claimed = await tx.order.updateMany({
        where: { id: saleId, voidedAt: null, status: { not: "CANCELLED" } },
        data: {
          status: "CANCELLED",
          voidedAt: new Date(),
          voidReason: input.reason,
        },
      });
      if (claimed.count === 0) {
        throw new ValidationError("This bill is already cancelled");
      }

      // Read after claiming, so these are the quantities and the money as they
      // stand now rather than as they looked before the guard.
      const claimedSale = await tx.order.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: true, payments: true },
      });

      for (const item of claimedSale.items) {
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
          where: {
            id: item.productId,
            stock: { gt: 0 },
            status: "OUT_OF_STOCK",
          },
          data: { status: "ACTIVE" },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            delta: putBack,
            reason: "VOID",
            orderId: saleId,
            note: input.reason,
            createdById: adminId,
          },
        });
      }

      // Money already taken is handed back, recorded as a negative payment so
      // the day's cash total nets out correctly.
      const refundable = roundMoney(claimedSale.amountPaid);
      const refundedBefore = claimedSale.payments.some(
        (payment) => payment.amount < 0,
      );

      if (refundable > 0) {
        await tx.payment.create({
          data: {
            orderId: saleId,
            method:
              claimedSale.payments.find((payment) => payment.amount > 0)
                ?.method ?? "CASH",
            amount: -refundable,
            reference: `Bill cancelled: ${input.reason}`,
            createdById: adminId,
          },
        });
      }

      return tx.order.update({
        where: { id: saleId },
        data: {
          amountPaid: 0,
          balanceDueDate: null,
          paymentStatus:
            refundable > 0 || refundedBefore ? "REFUNDED" : "PENDING",
        },
        include: saleInclude,
      });
    },
    { timeout: 20_000 },
  );
}

/**
 * Take items back off a bill.
 *
 * The bill total drops by what came back, so revenue on the dashboard and in
 * the monthly report reflects what the shop actually kept, and the line keeps
 * a `returnedQty` so the original sale is still legible on a reprint.
 *
 * Every check  how many are left to return, how much may be refunded, what
 * goes back on the shelf  is made inside one transaction against guarded
 * writes, because each of them is meaningless if the bill can move underneath
 * it while the return is being recorded.
 */
export async function returnSaleItems(
  saleId: number,
  input: ReturnSaleInput,
  adminId: number,
) {
  const refund = roundMoney(input.refundAmount);

  return prisma.$transaction(
    async (tx) => {
      const exists = await tx.order.findUnique({
        where: { id: saleId },
        select: { id: true, channel: true },
      });
      if (!exists) throw new NotFoundError("Bill not found");
      if (exists.channel !== "POS") {
        throw new ValidationError(
          "Returns are recorded here for counter bills only. Handle a website order from the Orders screen.",
        );
      }

      // Claim the bill before reading it. The write takes a row lock that is
      // held to the end of the transaction, so a second return  or someone
      // cancelling the bill at the same moment  waits here and then works
      // from what this one leaves behind, instead of both of them writing
      // totals derived from the same stale snapshot.
      const claimed = await tx.order.updateMany({
        where: { id: saleId, voidedAt: null },
        data: { updatedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new ValidationError(
          "This bill was cancelled, so there is nothing to return",
        );
      }

      const sale = await tx.order.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: true },
      });

      const itemsById = new Map(sale.items.map((item) => [item.id, item]));
      let returnedValue = 0;

      for (const line of input.items) {
        const item = itemsById.get(line.itemId);
        if (!item) throw new NotFoundError("That line is not on this bill");

        const remaining = item.quantity - item.returnedQty;
        if (line.quantity > remaining) {
          throw new ValidationError(
            `Only ${remaining} of "${item.title ?? "that item"}" can still be returned`,
          );
        }

        // What the customer paid for these units: the charged unit price, less
        // this line's own discount in proportion to what is coming back.
        const unit = item.discountedPrice ?? item.price;
        const shareOfLineDiscount =
          item.quantity > 0
            ? (item.lineDiscount || 0) * (line.quantity / item.quantity)
            : 0;
        returnedValue = roundMoney(
          returnedValue + unit * line.quantity - shareOfLineDiscount,
        );
      }

      // A bill-level discount was spread across everything on the bill, so the
      // share of it that belonged to the returned goods comes off the refund.
      const discountShare =
        sale.subtotal > 0
          ? roundMoney(sale.discountAmount * (returnedValue / sale.subtotal))
          : 0;
      const refundable = roundMoney(
        Math.min(Math.max(0, returnedValue - discountShare), sale.amountPaid),
      );

      if (refund > refundable + 0.01) {
        throw new ValidationError(
          `The most that can be refunded on this return is Rs ${refundable.toFixed(2)}`,
        );
      }

      for (const line of input.items) {
        const item = itemsById.get(line.itemId)!;

        // Guarded: the line accepts the return only while it still has that
        // many un-returned units, so two returns racing cannot between them
        // give back more than was sold.
        const marked = await tx.orderItem.updateMany({
          where: {
            id: item.id,
            returnedQty: { lte: item.quantity - line.quantity },
          },
          data: { returnedQty: { increment: line.quantity } },
        });
        if (marked.count === 0) {
          throw new ValidationError(
            `"${item.title ?? "That item"}" has already been returned. Open the bill again.`,
          );
        }

        if (item.productId != null) {
          if (input.restock) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: line.quantity } },
            });
            // The units go back onto the colourway they were sold from.
            await returnColorStock(tx, {
              productId: item.productId,
              color: item.color,
              quantity: line.quantity,
            });
            await tx.product.updateMany({
              where: {
                id: item.productId,
                stock: { gt: 0 },
                status: "OUT_OF_STOCK",
              },
              data: { status: "ACTIVE" },
            });
          }

          // Written either way: goods too damaged to resell still left the
          // shop and came back, and a ledger with a hole in it explains
          // nothing. A zero movement records the event without moving stock.
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              delta: input.restock ? line.quantity : 0,
              reason: "RETURN",
              orderId: saleId,
              note: input.restock
                ? input.reason || null
                : [input.reason, "Not resellable - not put back into stock"]
                    .filter(Boolean)
                    .join(" - "),
              createdById: adminId,
            },
          });
        }
      }

      if (refund > 0) {
        await tx.payment.create({
          data: {
            orderId: saleId,
            method: input.refundMethod,
            amount: -refund,
            reference: input.reason ? `Refund: ${input.reason}` : "Refund",
            createdById: adminId,
          },
        });
      }

      const subtotal = roundMoney(Math.max(0, sale.subtotal - returnedValue));
      // The bill discount shrinks with the bill: keeping all of it against
      // what is left would hand the customer the discount for goods they gave
      // back.
      const discount = roundMoney(
        Math.min(Math.max(0, sale.discountAmount - discountShare), subtotal),
      );
      const totalAmount = roundMoney(subtotal - discount);
      const amountPaid = roundMoney(Math.max(0, sale.amountPaid - refund));

      const fullyReturned = sale.items.every((item) => {
        const line = input.items.find((row) => row.itemId === item.id);
        return item.returnedQty + (line?.quantity ?? 0) >= item.quantity;
      });

      return tx.order.update({
        where: { id: saleId },
        data: {
          subtotal,
          discountAmount: discount,
          totalAmount,
          amountPaid,
          paymentStatus:
            fullyReturned && refund > 0
              ? "REFUNDED"
              : resolvePaymentStatus(totalAmount, amountPaid),
          balanceDueDate:
            roundMoney(totalAmount - amountPaid) <= 0.005
              ? null
              : sale.balanceDueDate,
          notes: input.reason
            ? [sale.notes, `Return: ${input.reason}`].filter(Boolean).join("\n")
            : sale.notes,
        },
        include: saleInclude,
      });
    },
    { timeout: 20_000 },
  );
}
