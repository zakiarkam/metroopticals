import { prisma } from "@/lib/db/prisma";
import { OrderStatus } from "@prisma/client";
import type { DashboardData } from "@/features/dashboard/types/dashboard";
import { orderCustomerName } from "@/features/orders/utils/order-display";
import {
  getOutstandingBills,
  getTodayCounterSnapshot,
} from "@/features/pos/services/pos-report-service";
import {
  shopDateKey,
  shopDateKeyDaysAgo,
  shopDayKeysBetween,
  shopDayStart,
} from "@/features/pos/utils/shop-time";

const orderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const percentChange = (current: number, previous: number) => {
  if (previous <= 0) return {};
  const delta = ((current - previous) / previous) * 100;
  return {
    change: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
    direction: delta >= 0 ? ("up" as const) : ("down" as const),
  };
};

export async function getDashboardSummary(days = 30): Promise<DashboardData> {
  // The window starts at the shop's midnight, not `days` × 24h ago, so the
  // range behind the headline numbers is exactly the range the trend chart
  // draws  otherwise the morning of the first day counted towards the KPIs
  // but had no bar to sit on.
  const since = shopDayStart(shopDateKeyDaysAgo(days - 1));
  const previousSince = new Date(since.getTime() - days * DAY_MS);

  const inRange = { createdAt: { gte: since } };
  const inPrevious = { createdAt: { gte: previousSince, lt: since } };
  // Cancelled orders never count towards revenue or completed orders.
  const live = { status: { not: "CANCELLED" as OrderStatus } };
  const outOfStockWhere = {
    OR: [{ stock: { lte: 0 } }, { status: "OUT_OF_STOCK" }],
  };

  const [
    totalOrders,
    previousOrders,
    allOrdersInRange,
    totalProducts,
    totalCustomers,
    previousCustomers,
    revenue,
    previousRevenue,
    lowStockCount,
    outOfStockCount,
    recentOrders,
    orderItems,
    statusCounts,
    channelTotals,
    counterToday,
    outstanding,
    revenueRows,
    outOfStockProducts,
  ] = await Promise.all([
    prisma.order.count({ where: { ...inRange, ...live } }),
    prisma.order.count({ where: { ...inPrevious, ...live } }),
    prisma.order.count({ where: inRange }),
    prisma.product.count(),
    prisma.user.count({ where: { role: "CUSTOMER", ...inRange } }),
    prisma.user.count({ where: { role: "CUSTOMER", ...inPrevious } }),
    prisma.order.aggregate({
      where: { ...inRange, ...live },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { ...inPrevious, ...live },
      _sum: { totalAmount: true },
    }),
    prisma.product.count({ where: { stock: { lte: 10, gt: 0 } } }),
    prisma.product.count({ where: outOfStockWhere }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.orderItem.findMany({
      where: { order: { ...inRange, ...live } },
      select: {
        productId: true,
        quantity: true,
        price: true,
        discountedPrice: true,
        lineDiscount: true,
      },
    }),
    prisma.order.groupBy({ by: ["status"], where: inRange, _count: { _all: true } }),
    // Website against counter, so the two are comparable at a glance.
    prisma.order.groupBy({
      by: ["channel"],
      where: { ...inRange, ...live },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    getTodayCounterSnapshot(),
    getOutstandingBills(200),
    // Day-by-day takings for the trend line. Only the four fields the chart
    // needs, so a year-long range stays a small query.
    prisma.order.findMany({
      where: { ...inRange, ...live },
      select: { createdAt: true, channel: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({
      where: outOfStockWhere,
      take: 10,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      include: { category: { select: { name: true } } },
    }),
  ]);

  const sales = new Map<number, { sold: number; revenue: number }>();
  for (const item of orderItems) {
    // Service lines (an eye test, a fitting) carry no product, and neither do
    // lines whose product has since been deleted  neither can rank here.
    if (item.productId == null) continue;
    const entry = sales.get(item.productId) ?? { sold: 0, revenue: 0 };
    entry.sold += item.quantity;
    // Net of the counter's per-line discounts, so a discounted sale is not
    // reported as having brought in its full ticket price.
    entry.revenue +=
      (item.discountedPrice ?? item.price) * item.quantity -
      (item.lineDiscount || 0);
    sales.set(item.productId, entry);
  }
  const ranked = Array.from(sales.entries())
    .sort((a, b) => b[1].sold - a[1].sold)
    .slice(0, 5);

  const products = await prisma.product.findMany({
    where: { id: { in: ranked.map(([id]) => id) } },
    include: { category: { select: { name: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const topProducts = ranked.flatMap(([productId, stats]) => {
    const product = productMap.get(productId);
    if (!product) return [];
    return [
      {
        id: product.id,
        name: product.title,
        category: product.category?.name,
        sold: stats.sold,
        revenue: stats.revenue,
        price: product.price,
        discountedPrice: product.discountedPrice,
        images: product.images || [],
        stock: product.stock,
        description: product.description,
        status: product.status,
      },
    ];
  });

  const countByStatus = new Map(
    statusCounts.map((row) => [row.status, row._count._all])
  );
  const statusBreakdown = orderStatuses.map((status) => {
    const count = countByStatus.get(status) ?? 0;
    return {
      status,
      count,
      percentage: allOrdersInRange > 0 ? (count / allOrdersInRange) * 100 : 0,
    };
  });

  // Bucketed by the shop's day rather than the server's, so an evening sale
  // lands on the day the shop actually made it.
  const byDay = new Map<string, { online: number; counter: number; orders: number }>();
  for (const row of revenueRows) {
    const key = shopDateKey(row.createdAt);
    const entry = byDay.get(key) ?? { online: 0, counter: 0, orders: 0 };
    if (row.channel === "POS") entry.counter += row.totalAmount;
    else entry.online += row.totalAmount;
    entry.orders += 1;
    byDay.set(key, entry);
  }

  // Every day in the range, including the quiet ones  a trend with gaps in it
  // reads as busier than the shop actually was.
  const dailyRevenue = shopDayKeysBetween(
    shopDateKeyDaysAgo(days - 1),
    shopDateKey(),
  ).map((date) => {
    const entry = byDay.get(date) ?? { online: 0, counter: 0, orders: 0 };
    return {
      date,
      online: Math.round(entry.online * 100) / 100,
      counter: Math.round(entry.counter * 100) / 100,
      total: Math.round((entry.online + entry.counter) * 100) / 100,
      orders: entry.orders,
    };
  });

  const revenueTotal = revenue._sum.totalAmount || 0;
  const previousRevenueTotal = previousRevenue._sum.totalAmount || 0;

  return {
    metrics: {
      orders: { total: totalOrders, ...percentChange(totalOrders, previousOrders) },
      revenue: {
        total: revenueTotal,
        ...percentChange(revenueTotal, previousRevenueTotal),
      },
      customers: {
        total: totalCustomers,
        ...percentChange(totalCustomers, previousCustomers),
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: orderCustomerName(order),
      status: order.status,
      total: order.totalAmount,
      date: order.createdAt.toISOString(),
      channel: order.channel,
    })),
    topProducts,
    statusBreakdown,
    channelSplit: (["ONLINE", "POS"] as const).map((channel) => {
      const row = channelTotals.find((entry) => entry.channel === channel);
      return {
        channel,
        orders: row?._count._all ?? 0,
        revenue: row?._sum.totalAmount ?? 0,
      };
    }),
    counterToday,
    outstanding: outstanding.summary,
    dailyRevenue,
    outOfStockProducts: outOfStockProducts.map((product) => ({
      id: product.id,
      title: product.title,
      category: product.category?.name,
      stock: product.stock,
      lastUpdated: product.updatedAt.toISOString(),
    })),
  };
}
