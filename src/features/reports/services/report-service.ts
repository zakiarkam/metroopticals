import { prisma } from "@/lib/db/prisma";
import { shopDateKey } from "@/features/pos/utils/shop-time";
import type { ReportQueryInput } from "@/features/reports/validators/reports";
import type { ReportExportPayload } from "@/features/reports/types/report";
import type {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import {
  orderCustomerEmail,
  orderCustomerName,
} from "@/features/orders/utils/order-display";
import {
  renderExcelReport,
  renderPdfReport,
} from "@/features/reports/services/report-render";

type ReportRange = {
  startDate: Date;
  endDate: Date;
  label: string;
  isCustomRange: boolean;
};

export type ReportDataset = {
  orders: Array<{
    id: number;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    billingPhone: string;
    createdAt: Date;
    items: Array<{
      quantity: number;
      returnedQty: number;
      price: number;
      discountedPrice: number | null;
      lineDiscount: number;
      title: string | null;
      color: string | null;
      product: {
        title: string;
        slug: string | null;
        sku: string | null;
      } | null;
    }>;
    user: { name: string | null; email: string } | null;
    billingName: string;
    billingEmail: string | null;
    channel: OrderChannel;
    paymentStatus: PaymentStatus;
    amountPaid: number;
    paymentMethod: string | null;
    customer: { name: string; email: string | null } | null;
    createdBy: { name: string | null } | null;
  }>;
  products: Array<{
    id: number;
    title: string;
    slug: string;
    price: number;
    stock: number;
    status: string;
    category: { name: string } | null;
    _count: { orderItems: number };
  }>;
  customers: number;
  statusBreakdown: Array<{ status: OrderStatus; _count: number }>;
  topProductsGrouped: Array<{
    productId: number;
    sold: number;
    revenue: number;
  }>;
  topProductDetails: Map<
    number,
    {
      id: number;
      title: string;
      slug: string;
      category: { name: string } | null;
    }
  >;
  /** Money actually collected in the period, however the sale was made. */
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    createdAt: Date;
    order: { channel: OrderChannel } | null;
    createdBy: { id: number; name: string | null } | null;
  }>;
};

export type ReportRangeInfo = ReportRange;
export type ChannelSummary = ReturnType<typeof summariseChannels>;

/**
 * Website against counter, and how the counter's money came in.
 *
 * Revenue is counted from the bills (what was sold), collections from the
 * payments (what reached the till) - on a bill paid off in instalments those
 * are two different numbers, and cashing up needs the second one.
 */
export const summariseChannels = (dataset: ReportDataset) => {
  const live = dataset.orders.filter((order) => order.status !== "CANCELLED");

  const byChannel = (["ONLINE", "POS"] as const).map((channel) => {
    const rows = live.filter((order) => order.channel === channel);
    return {
      channel,
      orders: rows.length,
      revenue: rows.reduce((sum, order) => sum + order.totalAmount, 0),
      collected: rows.reduce((sum, order) => sum + order.amountPaid, 0),
    };
  });

  const methods = new Map<string, { collected: number; refunded: number }>();
  for (const payment of dataset.payments) {
    const entry = methods.get(payment.method) ?? { collected: 0, refunded: 0 };
    if (payment.amount >= 0) entry.collected += payment.amount;
    else entry.refunded += Math.abs(payment.amount);
    methods.set(payment.method, entry);
  }

  const cashiers = new Map<
    string,
    { name: string; bills: number; billed: number; collected: number }
  >();
  for (const order of live) {
    if (order.channel !== "POS") continue;
    const name = order.createdBy?.name || "Unknown";
    const entry = cashiers.get(name) ?? {
      name,
      bills: 0,
      billed: 0,
      collected: 0,
    };
    entry.bills += 1;
    entry.billed += order.totalAmount;
    entry.collected += order.amountPaid;
    cashiers.set(name, entry);
  }

  const counterBills = live.filter((order) => order.channel === "POS");

  return {
    byChannel,
    byMethod: Array.from(methods.entries()).map(([method, value]) => ({
      method,
      collected: value.collected,
      refunded: value.refunded,
      net: value.collected - value.refunded,
    })),
    byCashier: Array.from(cashiers.values()).sort(
      (a, b) => b.billed - a.billed,
    ),
    counter: {
      bills: counterBills.length,
      cancelled: dataset.orders.filter(
        (order) => order.channel === "POS" && order.status === "CANCELLED",
      ).length,
      billed: counterBills.reduce((sum, order) => sum + order.totalAmount, 0),
      collected: counterBills.reduce((sum, order) => sum + order.amountPaid, 0),
      outstanding: counterBills.reduce(
        (sum, order) => sum + Math.max(0, order.totalAmount - order.amountPaid),
        0,
      ),
    },
  };
};

const sumRevenue = (
  orders: Array<{ status: OrderStatus; totalAmount: number }>,
) =>
  orders.reduce(
    (sum, order) =>
      order.status === "CANCELLED" ? sum : sum + order.totalAmount,
    0,
  );

// Report boundaries are taken in the store's local time zone (Sri Lanka).
const TZ_OFFSET = "+05:30";

const buildMonthlyRange = (month: string): ReportRange => {
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(`${month}-01T00:00:00${TZ_OFFSET}`);
  const nextMonth =
    monthNum === 12
      ? `${year + 1}-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}`;
  const endDate = new Date(
    new Date(`${nextMonth}-01T00:00:00${TZ_OFFSET}`).getTime() - 1,
  );
  return {
    startDate,
    endDate,
    label: month,
    isCustomRange: false,
  };
};

const buildCustomRange = (startDate: string, endDate: string): ReportRange => {
  return {
    startDate: new Date(`${startDate}T00:00:00${TZ_OFFSET}`),
    endDate: new Date(`${endDate}T23:59:59.999${TZ_OFFSET}`),
    label: `${startDate}_to_${endDate}`,
    isCustomRange: true,
  };
};

export const resolveReportRange = (query: ReportQueryInput): ReportRange => {
  if (query.startDate && query.endDate) {
    return buildCustomRange(query.startDate, query.endDate);
  }

  const normalizedMonth = normalizeMonth(query.month);
  return buildMonthlyRange(normalizedMonth);
};

export const fetchReportDataset = async (
  range: ReportRange,
): Promise<ReportDataset> => {
  const { startDate, endDate } = range;

  const [orders, products, customers, statusBreakdown, soldItems, payments] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          items: {
            include: { product: true },
          },
          user: true,
          customer: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        include: {
          category: true,
          _count: {
            select: { orderItems: true },
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: startDate, lte: endDate },
            status: { not: "CANCELLED" },
          },
        },
        select: {
          productId: true,
          quantity: true,
          price: true,
          discountedPrice: true,
          lineDiscount: true,
        },
      }),
      prisma.payment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: {
          method: true,
          amount: true,
          createdAt: true,
          order: { select: { channel: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

  const sales = new Map<number, { sold: number; revenue: number }>();
  for (const item of soldItems) {
    // Service lines and lines whose product was deleted cannot be ranked.
    if (item.productId == null) continue;
    const entry = sales.get(item.productId) ?? { sold: 0, revenue: 0 };
    entry.sold += item.quantity;
    entry.revenue +=
      (item.discountedPrice ?? item.price) * item.quantity -
      (item.lineDiscount || 0);
    sales.set(item.productId, entry);
  }
  const topProductsGrouped = Array.from(sales.entries())
    .sort((a, b) => b[1].sold - a[1].sold)
    .slice(0, 10)
    .map(([productId, stats]) => ({
      productId,
      sold: stats.sold,
      revenue: stats.revenue,
    }));

  const productIds = topProductsGrouped.map((item) => item.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });
  const topProductDetails = new Map(
    topProducts.map((product) => [product.id, product]),
  );

  return {
    orders,
    products,
    customers,
    statusBreakdown,
    topProductsGrouped,
    topProductDetails,
    payments,
  };
};

export const buildMonthlySummaryFromDataset = (
  range: ReportRange,
  dataset: ReportDataset,
): MonthlyReportData => {
  // A cancelled bill brought in nothing, so it belongs in neither the count
  // nor the average  counting it would quietly drag the average sale down.
  const liveOrders = dataset.orders.filter(
    (order) => order.status !== "CANCELLED",
  );
  const totalRevenue = sumRevenue(dataset.orders);
  const totalOrders = liveOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    month: range.label,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    newCustomers: dataset.customers,
    totalProducts: dataset.products.length,
    statusBreakdown: dataset.statusBreakdown.map((status) => ({
      status: status.status,
      count: status._count,
    })),
  };
};

export async function generateExcelReportForRange(
  range: ReportRange,
  dataset?: ReportDataset,
): Promise<Buffer> {
  const data = dataset ?? (await fetchReportDataset(range));
  return renderExcelReport(range, data, summariseChannels(data));
}

export async function generatePDFReportForRange(
  range: ReportRange,
  dataset?: ReportDataset,
): Promise<Buffer> {
  const data = dataset ?? (await fetchReportDataset(range));
  return renderPdfReport(range, data, summariseChannels(data));
}

interface MonthlyReportData {
  month: string;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  newCustomers: number;
  totalProducts: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export const buildReportPayload = (
  range: ReportRange,
  dataset: ReportDataset,
): ReportExportPayload => {
  const summary = buildMonthlySummaryFromDataset(range, dataset);

  return {
    range: {
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      label: range.label,
      isCustomRange: range.isCustomRange,
    },
    summary,
    orders: dataset.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      /** Walk-in at the counter, or the website. */
      channel: order.channel,
      channelLabel: order.channel === "POS" ? "Walk-in" : "Website",
      paymentStatus: order.paymentStatus,
      amountPaid: order.amountPaid,
      balance: Math.max(0, order.totalAmount - order.amountPaid),
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      customerName: orderCustomerName(order),
      customerEmail: orderCustomerEmail(order),
      createdAt: order.createdAt.toISOString(),
    })),
    products: dataset.products.map((product) => ({
      id: product.id,
      title: product.title,
      sku: product.slug,
      category: product.category?.name || "Uncategorized",
      price: product.price,
      stock: product.stock,
      status: product.status,
      ordersCount: product._count.orderItems,
    })),
    topProducts: dataset.topProductsGrouped.map((item) => {
      const product = dataset.topProductDetails.get(item.productId);
      return {
        id: item.productId,
        name: product?.title || "Unknown",
        sku: product?.slug || "N/A",
        category: product?.category?.name || "N/A",
        sold: item.sold,
        revenue: item.revenue,
      };
    }),
    channels: summariseChannels(dataset),
    statusBreakdown: summary.statusBreakdown,
  };
};

export type MonthlyReportResult =
  | { type: "json"; data: MonthlyReportData }
  | { type: "excel"; data: Buffer; filename: string }
  | { type: "pdf"; data: Buffer; filename: string };

const normalizeMonth = (month?: string) => {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }
  return shopDateKey().slice(0, 7);
};

export async function generateMonthlyReport(
  query: ReportQueryInput,
): Promise<MonthlyReportResult> {
  const range = resolveReportRange(query);
  const month = normalizeMonth(query.month);

  if (query.format === "excel") {
    const dataset = await fetchReportDataset(range);
    const data = await generateExcelReportForRange(range, dataset);
    return {
      type: "excel",
      data,
      filename: range.isCustomRange
        ? `report-${range.label}.xlsx`
        : `monthly-report-${month}.xlsx`,
    };
  }

  if (query.format === "pdf") {
    const dataset = await fetchReportDataset(range);
    const data = await generatePDFReportForRange(range, dataset);
    return {
      type: "pdf",
      data,
      filename: range.isCustomRange
        ? `report-${range.label}.pdf`
        : `monthly-report-${month}.pdf`,
    };
  }

  const dataset = await fetchReportDataset(range);
  const data = buildMonthlySummaryFromDataset(range, dataset);
  return {
    type: "json",
    data,
  };
}
