import { prisma } from "@/lib/db/prisma";
import { OrderStatus } from "@prisma/client";
import type { DashboardData } from "@/features/dashboard/types/dashboard";

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
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY_MS);
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
      select: { productId: true, quantity: true, price: true, discountedPrice: true },
    }),
    prisma.order.groupBy({ by: ["status"], where: inRange, _count: { _all: true } }),
    prisma.product.findMany({
      where: outOfStockWhere,
      take: 10,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      include: { category: { select: { name: true } } },
    }),
  ]);

  const sales = new Map<number, { sold: number; revenue: number }>();
  for (const item of orderItems) {
    const entry = sales.get(item.productId) ?? { sold: 0, revenue: 0 };
    entry.sold += item.quantity;
    entry.revenue += (item.discountedPrice ?? item.price) * item.quantity;
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
      customer: order.user.name ?? order.billingName,
      status: order.status,
      total: order.totalAmount,
      date: order.createdAt.toISOString(),
    })),
    topProducts,
    statusBreakdown,
    outOfStockProducts: outOfStockProducts.map((product) => ({
      id: product.id,
      title: product.title,
      category: product.category?.name,
      stock: product.stock,
      lastUpdated: product.updatedAt.toISOString(),
    })),
  };
}
