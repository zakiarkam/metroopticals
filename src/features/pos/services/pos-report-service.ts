import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { roundMoney, savedLineUnitPrice } from "@/features/pos/utils/bill";
import {
  shopDateKey,
  shopDayKeysBetween,
  shopDayStart,
  shopRange,
} from "@/features/pos/utils/shop-time";
import type { DailyReportQueryInput } from "@/features/pos/validators/pos";

/**
 * What the counter took, over a shop day or a range of them.
 *
 * Written from the payments table rather than the bills, because those are two
 * different questions: a bill of Rs 12,000 with a Rs 4,000 advance means
 * Rs 12,000 of sales and Rs 4,000 in the till. Cashing up at the end of the
 * day needs the second number; the month's revenue needs the first.
 */

export type PosPeriodReport = Awaited<ReturnType<typeof getPosReport>>;

export async function getPosReport(query: DailyReportQueryInput) {
  const today = shopDateKey();
  const startKey = query.startDate || query.date || today;
  const endKey = query.endDate || query.date || startKey;
  const { start, end } = shopRange(startKey, endKey);

  const period = { gte: start, lt: end };
  const counterSales = { channel: "POS" as const, createdAt: period };

  const [bills, payments, onlineTotals] = await Promise.all([
    prisma.order.findMany({
      where: counterSales,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        amountPaid: true,
        discountAmount: true,
        billingName: true,
        voidedAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          select: {
            productId: true,
            title: true,
            quantity: true,
            returnedQty: true,
            price: true,
            discountedPrice: true,
            lineDiscount: true,
            product: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Collections are counted by when the money arrived, which is not always
    // the day the bill was written  a balance settled on collection belongs
    // to today's till, not to the day of the sale.
    prisma.payment.findMany({
      where: { createdAt: period, order: { channel: "POS" } },
      select: {
        method: true,
        amount: true,
        createdAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.order.aggregate({
      where: {
        channel: "ONLINE",
        createdAt: period,
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const liveBills = bills.filter((bill) => bill.status !== "CANCELLED");
  const cancelled = bills.filter((bill) => bill.status === "CANCELLED");

  const billed = roundMoney(
    liveBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
  );
  const discountGiven = roundMoney(
    liveBills.reduce((sum, bill) => sum + bill.discountAmount, 0),
  );
  const outstanding = roundMoney(
    liveBills.reduce(
      (sum, bill) => sum + Math.max(0, bill.totalAmount - bill.amountPaid),
      0,
    ),
  );

  const collected = roundMoney(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const refunded = roundMoney(
    payments
      .filter((payment) => payment.amount < 0)
      .reduce((sum, payment) => sum + Math.abs(payment.amount), 0),
  );

  const byMethod = new Map<string, { collected: number; refunded: number; count: number }>();
  for (const payment of payments) {
    const entry = byMethod.get(payment.method) ?? {
      collected: 0,
      refunded: 0,
      count: 0,
    };
    if (payment.amount >= 0) {
      entry.collected = roundMoney(entry.collected + payment.amount);
      entry.count += 1;
    } else {
      entry.refunded = roundMoney(entry.refunded + Math.abs(payment.amount));
    }
    byMethod.set(payment.method, entry);
  }

  const byCashier = new Map<
    string,
    { id: number | null; name: string; bills: number; billed: number; collected: number }
  >();
  const cashierEntry = (id: number | null, name: string | null) => {
    const key = String(id ?? "unknown");
    const entry = byCashier.get(key) ?? {
      id,
      name: name || "Unknown",
      bills: 0,
      billed: 0,
      collected: 0,
    };
    byCashier.set(key, entry);
    return entry;
  };
  for (const bill of liveBills) {
    const entry = cashierEntry(bill.createdById, bill.createdBy?.name ?? null);
    entry.bills += 1;
    entry.billed = roundMoney(entry.billed + bill.totalAmount);
  }
  for (const payment of payments) {
    const entry = cashierEntry(payment.createdById, payment.createdBy?.name ?? null);
    entry.collected = roundMoney(entry.collected + payment.amount);
  }

  // Units sold, net of anything handed back.
  const soldByProduct = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  let itemsSold = 0;
  for (const bill of liveBills) {
    for (const item of bill.items) {
      const quantity = item.quantity - item.returnedQty;
      if (quantity <= 0) continue;
      itemsSold += quantity;
      const key = item.productId != null ? `p${item.productId}` : `s${item.title}`;
      const entry = soldByProduct.get(key) ?? {
        name: item.product?.title || item.title || "Item",
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += quantity;
      // The line's discount belongs to the units it was given on, so a
      // partly-returned line keeps only its share of it.
      const share =
        item.quantity > 0 ? (item.lineDiscount || 0) * (quantity / item.quantity) : 0;
      entry.revenue = roundMoney(
        entry.revenue + savedLineUnitPrice(item) * quantity - share,
      );
      soldByProduct.set(key, entry);
    }
  }

  // One row per shop day, so a range report can be read as a trend rather than
  // a single lump.
  const dayKeys = shopDayKeysBetween(startKey, endKey);
  const daily = dayKeys.map((key) => {
    const dayBills = liveBills.filter(
      (bill) => shopDateKey(bill.createdAt) === key,
    );
    const dayPayments = payments.filter(
      (payment) => shopDateKey(payment.createdAt) === key,
    );
    return {
      date: key,
      bills: dayBills.length,
      billed: roundMoney(dayBills.reduce((sum, bill) => sum + bill.totalAmount, 0)),
      collected: roundMoney(
        dayPayments.reduce((sum, payment) => sum + payment.amount, 0),
      ),
    };
  });

  return {
    range: { startDate: startKey, endDate: endKey, isSingleDay: startKey === endKey },
    summary: {
      bills: liveBills.length,
      cancelledBills: cancelled.length,
      itemsSold,
      billed,
      collected,
      refunded,
      outstanding,
      discountGiven,
      averageBill: liveBills.length
        ? roundMoney(billed / liveBills.length)
        : 0,
      onlineRevenue: roundMoney(onlineTotals._sum.totalAmount || 0),
      onlineOrders: onlineTotals._count._all,
    },
    byMethod: Array.from(byMethod.entries()).map(([method, value]) => ({
      method,
      ...value,
      net: roundMoney(value.collected - value.refunded),
    })),
    byCashier: Array.from(byCashier.values()).sort((a, b) => b.billed - a.billed),
    topProducts: Array.from(soldByProduct.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    daily,
    unpaidBills: liveBills
      .filter((bill) => bill.totalAmount - bill.amountPaid > 0.01)
      .map((bill) => ({
        id: bill.id,
        orderNumber: bill.orderNumber,
        customer: bill.billingName,
        createdAt: bill.createdAt.toISOString(),
        totalAmount: bill.totalAmount,
        amountPaid: bill.amountPaid,
        balance: roundMoney(bill.totalAmount - bill.amountPaid),
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20),
  };
}

/** Headline counter numbers for today, for the dashboard. */
export async function getTodayCounterSnapshot() {
  const today = shopDateKey();
  const report = await getPosReport({ date: today });

  const outstandingAll = await prisma.order.aggregate({
    where: {
      channel: "POS",
      status: { not: "CANCELLED" },
      paymentStatus: { in: ["PENDING", "PARTIAL"] },
    },
    _sum: { totalAmount: true, amountPaid: true },
    _count: { _all: true },
  });

  const billedTotal = outstandingAll._sum.totalAmount || 0;
  const paidTotal = outstandingAll._sum.amountPaid || 0;

  return {
    date: today,
    bills: report.summary.bills,
    billed: report.summary.billed,
    collected: report.summary.collected,
    cashCollected:
      report.byMethod.find((row) => row.method === "CASH")?.net ?? 0,
    itemsSold: report.summary.itemsSold,
    /** Every counter bill still owing money, not only today's. */
    balanceDue: roundMoney(Math.max(0, billedTotal - paidTotal)),
    unpaidBills: outstandingAll._count._all,
  };
}

/**
 * The credit book: every counter bill still owing money.
 *
 * An optical shop runs on advances  the customer pays part, the lenses are
 * ordered, they come back a week later to settle and collect. This is the list
 * that turns that habit into something the counter can act on: who owes what,
 * when they said they would come, and who is late.
 */
export async function getOutstandingBills(limit = 100) {
  // `paymentStatus` is rewritten from the totals on every sale, payment,
  // return and cancellation, so it is the reliable way to ask the database
  // for the bills that still owe something.
  const unsettled: Prisma.OrderWhereInput = {
    channel: "POS",
    status: { not: "CANCELLED" },
    paymentStatus: { in: ["PENDING", "PARTIAL"] },
  };

  // The list is capped for the screen, but the credit-book totals are not:
  // they are worked out over every unsettled bill, so the figure the counter
  // chases is the whole book rather than the first page of it.
  const [bills, allBalances] = await Promise.all([
    prisma.order.findMany({
      where: unsettled,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        balanceDueDate: true,
        totalAmount: true,
        amountPaid: true,
        billingName: true,
        billingPhone: true,
        status: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
      // Promised dates first and soonest first; bills with no promise date
      // sort last, because a date is what makes one chaseable before another.
      orderBy: [{ balanceDueDate: "asc" }, { createdAt: "asc" }],
      take: limit,
    }),
    prisma.order.findMany({
      where: unsettled,
      select: { totalAmount: true, amountPaid: true, balanceDueDate: true },
    }),
  ]);

  const todayKey = shopDateKey();
  const todayStart = shopDayStart(todayKey);

  const rows = bills
    .map((bill) => {
      const balance = roundMoney(bill.totalAmount - bill.amountPaid);
      const dueKey = bill.balanceDueDate ? shopDateKey(bill.balanceDueDate) : null;
      const daysLate = bill.balanceDueDate
        ? Math.floor(
            (todayStart.getTime() - shopDayStart(dueKey!).getTime()) / 86_400_000,
          )
        : 0;

      return {
        id: bill.id,
        orderNumber: bill.orderNumber,
        customer: bill.customer?.name || bill.billingName,
        phone: bill.customer?.phone || bill.billingPhone || "",
        createdAt: bill.createdAt.toISOString(),
        dueDate: dueKey,
        totalAmount: bill.totalAmount,
        amountPaid: bill.amountPaid,
        balance,
        /** Positive once the promised day has passed. */
        daysLate: bill.balanceDueDate ? Math.max(0, daysLate) : 0,
        overdue: bill.balanceDueDate ? daysLate > 0 : false,
        /** The goods are still in the shop waiting to be collected. */
        awaitingCollection: bill.status === "PROCESSING",
      };
    })
    .filter((row) => row.balance > 0.01);

  const book = allBalances
    .map((bill) => ({
      balance: roundMoney(bill.totalAmount - bill.amountPaid),
      dueKey: bill.balanceDueDate ? shopDateKey(bill.balanceDueDate) : null,
    }))
    .filter((entry) => entry.balance > 0.01);

  const overdue = book.filter(
    (entry) => entry.dueKey !== null && shopDayStart(entry.dueKey) < todayStart,
  );

  return {
    bills: rows,
    summary: {
      count: book.length,
      total: roundMoney(book.reduce((sum, entry) => sum + entry.balance, 0)),
      overdueCount: overdue.length,
      overdueTotal: roundMoney(
        overdue.reduce((sum, entry) => sum + entry.balance, 0),
      ),
      dueToday: book.filter((entry) => entry.dueKey === todayKey).length,
    },
  };
}
