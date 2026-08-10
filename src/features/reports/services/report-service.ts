import { prisma } from "@/lib/db/prisma";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportQueryInput } from "@/features/reports/validators/reports";
import type { ReportExportPayload } from "@/features/reports/types/report";
import fs from "node:fs/promises";
import path from "node:path";
import type { OrderStatus } from "@prisma/client";

type ReportRange = {
  startDate: Date;
  endDate: Date;
  label: string;
  isCustomRange: boolean;
};

type ReportDataset = {
  orders: Array<{
    id: number;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: Date;
    items: Array<{
      quantity: number;
      price: number;
      discountedPrice: number | null;
      product: { title: string; slug: string | null } | null;
    }>;
    user: { name: string; email: string };
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
    _count: { id: number };
    _sum: { price: number | null };
  }>;
  topProductDetails: Map<
    number,
    { id: number; title: string; slug: string; category: { name: string } | null }
  >;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDateDMY = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatDateTimeDMY = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatFileDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const buildMonthlyRange = (month: string): ReportRange => {
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);
  return {
    startDate,
    endDate,
    label: month,
    isCustomRange: false,
  };
};

const buildCustomRange = (startDate: string, endDate: string): ReportRange => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return {
    startDate: new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      0,
      0,
      0
    ),
    endDate: new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
      23,
      59,
      59
    ),
    label: `${formatFileDate(start)}_to_${formatFileDate(end)}`,
    isCustomRange: true,
  };
};

const resolveReportRange = (query: ReportQueryInput): ReportRange => {
  if (query.startDate && query.endDate) {
    return buildCustomRange(query.startDate, query.endDate);
  }

  const normalizedMonth = normalizeMonth(query.month);
  return buildMonthlyRange(normalizedMonth);
};

export async function generateMonthlyExcelReport(
  month: string
): Promise<Buffer> {
  return generateExcelReportForRange(buildMonthlyRange(month));
}

export const fetchReportDataset = async (
  range: ReportRange
): Promise<ReportDataset> => {
  const { startDate, endDate } = range;

  const [orders, products, customers, statusBreakdown, topProductsGrouped] =
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
      prisma.orderItem.groupBy({
        by: ["productId"],
        _count: { id: true },
        _sum: { price: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

  const productIds = topProductsGrouped.map((item) => item.productId);
  const topProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  });
  const topProductDetails = new Map(
    topProducts.map((product) => [product.id, product])
  );

  return {
    orders,
    products,
    customers,
    statusBreakdown,
    topProductsGrouped,
    topProductDetails,
  };
};

export const buildMonthlySummaryFromDataset = (
  range: ReportRange,
  dataset: ReportDataset
): MonthlyReportData => {
  const totalRevenue = dataset.orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  const totalOrders = dataset.orders.length;
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
  dataset?: ReportDataset
): Promise<Buffer> {
  const { startDate, endDate, isCustomRange } = range;
  const data = dataset ?? (await fetchReportDataset(range));
  const { orders, products, customers, statusBreakdown } = data;

  const totalRevenue = orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Metro Opticals";
  workbook.created = new Date();
  workbook.company = "Metro Opticals";

  // --- Summary Sheet ---
  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF4F46E5" } },
  });

  // Title
  summarySheet.mergeCells("A1:D1");
  summarySheet.getCell("A1").value = isCustomRange
    ? "SALES REPORT"
    : "MONTHLY SALES REPORT";
  summarySheet.getCell("A1").font = {
    size: 20,
    bold: true,
    color: { argb: "FF4F46E5" },
  };
  summarySheet.getCell("A1").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  summarySheet.getRow(1).height = 35;

  // Period
  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value =
    `Period: ${formatDateDMY(startDate)} - ${formatDateDMY(endDate)}`;
  summarySheet.getCell("A2").font = { size: 11, italic: true };
  summarySheet.getCell("A2").alignment = { horizontal: "center" };
  summarySheet.getRow(2).height = 20;

  summarySheet.addRow([]);

  // Key Metrics
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
    { header: "", key: "spacer", width: 5 },
    { header: "Status", key: "status", width: 20 },
    { header: "Count", key: "count", width: 15 },
  ];

  const metricsStartRow = 4;
  summarySheet.getRow(metricsStartRow).font = { bold: true, size: 11 };
  summarySheet.getRow(metricsStartRow).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  summarySheet.getRow(metricsStartRow).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  summarySheet.addRows([
    [
      "Total Revenue",
      formatNumber(totalRevenue),
      "",
      statusBreakdown[0]?.status || "N/A",
      statusBreakdown[0]?._count || 0,
    ],
    [
      "Total Orders",
      totalOrders,
      "",
      statusBreakdown[1]?.status || "N/A",
      statusBreakdown[1]?._count || 0,
    ],
    [
      "Average Order Value",
      formatNumber(avgOrderValue),
      "",
      statusBreakdown[2]?.status || "N/A",
      statusBreakdown[2]?._count || 0,
    ],
    [
      "New Customers",
      customers,
      "",
      statusBreakdown[3]?.status || "N/A",
      statusBreakdown[3]?._count || 0,
    ],
    [
      "Total Products",
      products.length,
      "",
      statusBreakdown[4]?.status || "N/A",
      statusBreakdown[4]?._count || 0,
    ],
  ]);

  // Add borders to metrics table
  for (let i = metricsStartRow; i <= metricsStartRow + 5; i++) {
    ["A", "B", "D", "E"].forEach((col) => {
      const cell = summarySheet.getCell(`${col}${i}`);
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  // --- Orders Sheet ---
  const ordersSheet = workbook.addWorksheet("Orders", {
    properties: { tabColor: { argb: "FF10B981" } },
  });

  ordersSheet.columns = [
    { header: "#", key: "no", width: 8 },
    { header: "Order Number", key: "orderNumber", width: 25 },
    { header: "Customer", key: "customer", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Status", key: "status", width: 15 },
    { header: "Items", key: "items", width: 10 },
    { header: "Total", key: "total", width: 15 },
    { header: "Date", key: "date", width: 20 },
  ];

  ordersSheet.getRow(1).font = { bold: true, size: 11 };
  ordersSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  ordersSheet.getRow(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  orders.forEach((order, index) => {
    ordersSheet.addRow({
      no: index + 1,
      orderNumber: order.orderNumber,
      customer: order.user.name,
      email: order.user.email,
      status: order.status,
      items: order.items.length,
      total: formatNumber(order.totalAmount),
      date: formatDateTimeDMY(order.createdAt),
    });
  });

  // Add zebra striping
  for (let i = 2; i <= ordersSheet.rowCount; i++) {
    if (i % 2 === 0) {
      ordersSheet.getRow(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    }
  }

  // --- Products Sheet ---
  const productsSheet = workbook.addWorksheet("Products", {
    properties: { tabColor: { argb: "FFF59E0B" } },
  });

  productsSheet.columns = [
    { header: "#", key: "no", width: 8 },
    { header: "Product Name", key: "name", width: 35 },
    { header: "SKU", key: "sku", width: 15 },
    { header: "Category", key: "category", width: 20 },
    { header: "Price", key: "price", width: 15 },
    { header: "Stock", key: "stock", width: 10 },
    { header: "Status", key: "status", width: 15 },
    { header: "Orders", key: "orders", width: 10 },
  ];

  productsSheet.getRow(1).font = { bold: true, size: 11 };
  productsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  productsSheet.getRow(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  products.forEach((product, index) => {
    productsSheet.addRow({
      no: index + 1,
      name: product.title,
      sku: product.slug,
      category: product.category?.name || "Uncategorized",
      price: formatNumber(product.price),
      stock: product.stock,
      status: product.status,
      orders: product._count.orderItems,
    });
  });

  // Add zebra striping
  for (let i = 2; i <= productsSheet.rowCount; i++) {
    if (i % 2 === 0) {
      productsSheet.getRow(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateMonthlyPDFReport(month: string): Promise<Buffer> {
  return generatePDFReportForRange(buildMonthlyRange(month));
}

export async function generatePDFReportForRange(
  range: ReportRange,
  dataset?: ReportDataset
): Promise<Buffer> {
  const { startDate, endDate, isCustomRange } = range;
  const data = dataset ?? (await fetchReportDataset(range));
  const orders = data.orders;
  const ordersByStatus = data.statusBreakdown;
  const topProducts = data.topProductsGrouped;
  const productMap = data.topProductDetails;

  const logoDataUrl = await (async () => {
    try {
      const logoPath = path.join(
        process.cwd(),
        "public",
        "images",
        "logo",
        "logo.png"
      );
      const file = await fs.readFile(logoPath);
      return `data:image/png;base64,${file.toString("base64")}`;
    } catch {
      return null;
    }
  })();

  const totalRevenue = orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Create PDF (A4, receipt-like styling)
  const doc = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "mm",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const lightGray: [number, number, number] = [245, 245, 245];
  const midGray: [number, number, number] = [120, 120, 120];
  const darkGray: [number, number, number] = [40, 40, 40];

  const formatRangeLabel = () =>
    `${formatDateDMY(startDate)} - ${formatDateDMY(endDate)}`;

  // Helper function for consistent styling
  const addHeader = () => {
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", marginX, 12, 24, 12, undefined, "FAST");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(
      "Metro Opticals",
      marginX + (logoDataUrl ? 28 : 0),
      16
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(
      "No 1, Main Street, Colombo, Sri Lanka.",
      marginX + (logoDataUrl ? 28 : 0),
      21
    );
    doc.text(
      "011 234 5678 | hello@metroopticals.lk",
      marginX + (logoDataUrl ? 28 : 0),
      25
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(
      isCustomRange ? "SALES REPORT" : "MONTHLY REPORT",
      pageWidth - marginX,
      16,
      {
        align: "right",
      }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(`Report Period: ${formatRangeLabel()}`, pageWidth - marginX, 21, {
      align: "right",
    });

    doc.setLineWidth(0.4);
    doc.setDrawColor(70, 70, 70);
    doc.line(marginX, 29, pageWidth - marginX, 29);
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    const footerTop = pageHeight - 14;
    doc.setLineWidth(0.4);
    doc.setDrawColor(70, 70, 70);
    doc.line(marginX, footerTop - 2, pageWidth - marginX, footerTop - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("Thank you for your business!", pageWidth / 2, footerTop + 2, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(
      "Questions? Contact hello@metroopticals.lk | 011 234 5678 | metroopticals.lk",
      pageWidth / 2,
      footerTop + 6,
      { align: "center" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 4,
      {
        align: "center",
      }
    );
  };

  // === PAGE 1: SUMMARY ===
  addHeader();

  // Summary Metrics Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Key Performance Metrics", marginX, 40);

  const summaryData = [
    ["Total Revenue", formatNumber(totalRevenue)],
    ["Total Orders", orders.length.toString()],
    ["Average Order Value", formatNumber(avgOrderValue)],
    [
      "Total Items Sold",
      orders.reduce((sum, o) => sum + o.items.length, 0).toString(),
    ],
  ];

  autoTable(doc, {
    startY: 44,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0 },
    headStyles: {
      fillColor: lightGray,
      textColor: darkGray,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: marginX, right: pageWidth / 2 + 4 },
  });

  // Order Status Breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Order Status Breakdown", pageWidth / 2 + 4, 40);

  const statusData = ordersByStatus.map((status) => {
    const percent =
      orders.length > 0 ? (status._count / orders.length) * 100 : 0;
    return [status.status, status._count.toString(), `${percent.toFixed(1)}%`];
  });

  autoTable(doc, {
    startY: 44,
    head: [["Status", "Count", "%"]],
    body: statusData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0 },
    headStyles: {
      fillColor: lightGray,
      textColor: darkGray,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: pageWidth / 2 + 4, right: marginX },
  });

  // Top Products
  const topProductsY =
    Math.max(
      (doc as any).lastAutoTable?.finalY || 0,
      44 + summaryData.length * 7
    ) + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Top 10 Products", marginX, topProductsY);

  const topProductsData = topProducts.map((item, index) => {
    const product = productMap.get(item.productId);
    return [
      (index + 1).toString(),
      product?.title || "Unknown",
      product?.slug || "N/A",
      product?.category?.name || "N/A",
      item._count.id.toString(),
      formatNumber(item._sum.price || 0),
    ];
  });

  autoTable(doc, {
    startY: topProductsY + 4,
    head: [["#", "Product", "SKU", "Category", "Sold", "Revenue"]],
    body: topProductsData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0 },
    headStyles: {
      fillColor: lightGray,
      textColor: darkGray,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { cellWidth: 10 },
      4: { halign: "center" },
      5: { halign: "right" },
    },
  });

  // === PAGE 2: RECENT ORDERS ===
  doc.addPage();
  addHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Recent Orders", marginX, 40);

  const ordersData = orders
    .slice(0, 25)
    .map((order, index) => [
      (index + 1).toString(),
      order.orderNumber,
      order.user.name,
      order.status,
      order.items.length.toString(),
      formatNumber(order.totalAmount),
      formatDateDMY(new Date(order.createdAt)),
    ]);

  autoTable(doc, {
    startY: 44,
    head: [["#", "Order #", "Customer", "Status", "Items", "Total", "Date"]],
    body: ordersData,
    theme: "plain",
    styles: { fontSize: 7.5, cellPadding: 1.8, lineWidth: 0 },
    headStyles: {
      fillColor: lightGray,
      textColor: darkGray,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { cellWidth: 8 },
      4: { halign: "center" },
      5: { halign: "right" },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    addFooter(pageNumber, totalPages);
  }

  return Buffer.from(doc.output("arraybuffer"));
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
  dataset: ReportDataset
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
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      customerName: order.user.name,
      customerEmail: order.user.email,
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
        sold: item._count.id,
        revenue: item._sum.price || 0,
      };
    }),
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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export async function generateMonthlyReport(
  query: ReportQueryInput
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
