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

export async function getDashboardSummary(): Promise<DashboardData> {
  const [
    totalOrders,
    totalProducts,
    totalCustomers,
    revenue,
    lowStockCount,
    outOfStockCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.product.count({ where: { stock: { lte: 10, gt: 0 } } }),
    prisma.product.count({ where: { status: "OUT_OF_STOCK" } }),
  ]);

  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const topProductsGrouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    _count: {
      id: true,
    },
    _sum: {
      price: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 5,
  });

  const productIds = topProductsGrouped.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const topProducts = topProductsGrouped
    .map<DashboardData["topProducts"][number] | null>((item) => {
      const product = productMap.get(item.productId);
      return product
        ? {
            id: product.id,
            name: product.title,
            category: product.category?.name,
            sold: item._count.id,
            revenue: item._sum.price || 0,
            price: product.price,
            discountedPrice: product.discountedPrice,
            images: product.images || [],
            stock: product.stock,
            description: product.description,
            status: product.status,
          }
        : null;
    })
    .filter(
      (item): item is DashboardData["topProducts"][number] => item !== null
    );

  const statusBreakdown = await Promise.all(
    orderStatuses.map(async (status) => {
      const count = await prisma.order.count({ where: { status } });
      return {
        status,
        count,
        percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
      };
    })
  );

  const outOfStockProducts = await prisma.product.findMany({
    where: {
      status: "OUT_OF_STOCK",
    },
    take: 10,
    orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const withChange = (
    total: number,
    change: string,
    direction: "up" | "down"
  ) => (total > 0 ? { change, direction } : {});

  const metricsChanges = {
    orders: withChange(totalOrders, "+8.6%", "up"),
    revenue: withChange(revenue._sum.totalAmount || 0, "+12.4%", "up"),
    customers: withChange(totalCustomers, "+5.2%", "up"),
  };

  return {
    metrics: {
      orders: {
        total: totalOrders,
        ...metricsChanges.orders,
      },
      revenue: {
        total: revenue._sum.totalAmount || 0,
        ...metricsChanges.revenue,
      },
      customers: {
        total: totalCustomers,
        ...metricsChanges.customers,
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
      customer: order.user.name,
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
