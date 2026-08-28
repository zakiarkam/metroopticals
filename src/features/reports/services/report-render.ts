import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "node:fs/promises";
import path from "node:path";
import { siteConfig } from "@/config/site";
import type {
  ChannelSummary,
  ReportDataset,
  ReportRangeInfo,
} from "@/features/reports/services/report-service";
import {
  orderCustomerEmail,
  orderCustomerName,
  orderLineName,
} from "@/features/orders/utils/order-display";
import { shopDateKey } from "@/features/pos/utils/shop-time";

/**
 * Every date on the report is the shop's date.
 *
 * The server runs in UTC, so without this an evening sale  and the period
 * line itself  slides back a day: an August report would open "31 Jul".
 */
const SHOP_TIME_ZONE = "Asia/Colombo";

/**
 * The sales report, as a spreadsheet and as a PDF.
 *
 * Both are built from the same rows and the same arithmetic, so the number on
 * a printed page can be traced to a cell in the workbook. The spreadsheet is
 * for working with  every sale, every line, filterable; the PDF is for
 * reading  the month on one page, then the detail behind it.
 */

// ---------------------------------------------------------------- palette
// The admin's own colours, so the report reads as the shop's document rather
// than a generic export.
const INK = "1B1713";
const GOLD = "8F6A37";
const GOLD_SOFT = "F3E9D6";
const IVORY = "FAF8F4";
const SAND = "F4F0E8";
const RULE = "E7E0D4";
const MUTED = "6F6555";
const GREEN = "2E7D4F";
const RED = "C1272D";

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(0, 2), 16),
  parseInt(hex.slice(2, 4), 16),
  parseInt(hex.slice(4, 6), 16),
];

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const money = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const moneyShort = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(value)}`;

const dmy = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    timeZone: SHOP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const dmyTime = (date: Date) =>
  date.toLocaleString("en-GB", {
    timeZone: SHOP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: SHOP_TIME_ZONE,
    day: "2-digit",
    month: "short",
  });

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "In progress",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Unpaid",
  PARTIAL: "Part paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  ONLINE: "Online",
  MIXED: "Split",
};

// -------------------------------------------------------------- the facts
// Everything both documents print, worked out once.

type Facts = ReturnType<typeof deriveFacts>;

export function deriveFacts(
  range: ReportRangeInfo,
  data: ReportDataset,
  channels: ChannelSummary,
) {
  const live = data.orders.filter((order) => order.status !== "CANCELLED");
  const cancelled = data.orders.length - live.length;

  const revenue = round2(live.reduce((sum, order) => sum + order.totalAmount, 0));
  const collected = round2(
    data.payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const refunded = round2(
    data.payments
      .filter((payment) => payment.amount < 0)
      .reduce((sum, payment) => sum + Math.abs(payment.amount), 0),
  );
  const outstanding = round2(
    live.reduce(
      (sum, order) => sum + Math.max(0, order.totalAmount - order.amountPaid),
      0,
    ),
  );
  const discounts = round2(
    live.reduce(
      (sum, order) =>
        sum +
        order.discountAmount +
        order.items.reduce((inner, item) => inner + (item.lineDiscount || 0), 0),
      0,
    ),
  );
  const itemsSold = live.reduce(
    (sum, order) =>
      sum + order.items.reduce((inner, item) => inner + item.quantity - item.returnedQty, 0),
    0,
  );

  // One row per shop day across the whole range, quiet days included, so the
  // daily table and the chart read as a calendar rather than a list of busy
  // days.
  const dayKeys: string[] = [];
  for (
    let cursor = new Date(range.startDate.getTime());
    cursor <= range.endDate && dayKeys.length < 400;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    const key = shopDateKey(cursor);
    if (!dayKeys.includes(key)) dayKeys.push(key);
  }
  const byDay = new Map(
    dayKeys.map((key) => [
      key,
      { date: key, webOrders: 0, web: 0, counterBills: 0, counter: 0, collected: 0, items: 0 },
    ]),
  );
  for (const order of live) {
    const row = byDay.get(shopDateKey(order.createdAt));
    if (!row) continue;
    const quantity = order.items.reduce((sum, item) => sum + item.quantity - item.returnedQty, 0);
    if (order.channel === "POS") {
      row.counterBills += 1;
      row.counter = round2(row.counter + order.totalAmount);
    } else {
      row.webOrders += 1;
      row.web = round2(row.web + order.totalAmount);
    }
    row.items += quantity;
  }
  for (const payment of data.payments) {
    const row = byDay.get(shopDateKey(payment.createdAt));
    if (row) row.collected = round2(row.collected + payment.amount);
  }
  const daily = Array.from(byDay.values()).map((row) => ({
    ...row,
    total: round2(row.web + row.counter),
  }));
  const busiest = daily.reduce(
    (best, row) => (row.total > (best?.total ?? -1) ? row : best),
    null as (typeof daily)[number] | null,
  );

  const topProducts = data.topProductsGrouped.map((item, index) => {
    const product = data.topProductDetails.get(item.productId);
    return {
      rank: index + 1,
      name: product?.title || "Unknown",
      sku: product?.slug || "",
      category: product?.category?.name || "",
      sold: item.sold,
      revenue: round2(item.revenue),
    };
  });

  const statusRows = data.statusBreakdown
    .map((row) => ({
      status: STATUS_LABEL[row.status] || row.status,
      count: row._count,
      share: data.orders.length ? round2((row._count / data.orders.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const lowStock = data.products
    .filter((product) => product.status !== "INACTIVE" && product.stock <= 10)
    .sort((a, b) => a.stock - b.stock);

  return {
    range,
    title: range.isCustomRange ? "Sales report" : "Monthly sales report",
    period: `${dmy(range.startDate)} – ${dmy(range.endDate)}`,
    kpis: {
      revenue,
      sales: live.length,
      averageSale: live.length ? round2(revenue / live.length) : 0,
      itemsSold,
      collected,
      refunded,
      outstanding,
      discounts,
      cancelled,
      newAccounts: data.customers,
    },
    channels,
    daily,
    busiest,
    topProducts,
    statusRows,
    lowStock,
    orders: data.orders,
  };
}

// ============================================================== workbook

const headerRow = (sheet: ExcelJS.Worksheet, rowNumber = 1) => {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10.5 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GOLD}` } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
};

const zebra = (sheet: ExcelJS.Worksheet, from: number) => {
  for (let index = from; index <= sheet.rowCount; index += 1) {
    if ((index - from) % 2 === 1) {
      sheet.getRow(index).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${IVORY}` },
      };
    }
  }
};

const moneyColumns = (sheet: ExcelJS.Worksheet, keys: string[]) => {
  keys.forEach((key) => {
    sheet.getColumn(key).numFmt = "#,##0.00";
    sheet.getColumn(key).alignment = { horizontal: "right" };
  });
};

const sectionTitle = (sheet: ExcelJS.Worksheet, text: string) => {
  const row = sheet.addRow([text]);
  row.font = { bold: true, size: 12, color: { argb: `FF${GOLD}` } };
  row.height = 22;
  return row;
};

const miniHead = (sheet: ExcelJS.Worksheet, cells: string[]) => {
  const row = sheet.addRow(cells);
  row.font = { bold: true, color: { argb: `FF${INK}` }, size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${SAND}` } };
  row.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: `FF${RULE}` } } };
  });
  return row;
};

export async function renderExcelReport(
  range: ReportRangeInfo,
  data: ReportDataset,
  channels: ChannelSummary,
): Promise<Buffer> {
  const facts = deriveFacts(range, data, channels);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = siteConfig.legalName;
  workbook.company = siteConfig.legalName;
  workbook.created = new Date();

  // ------------------------------------------------------------ Summary
  const summary = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: `FF${GOLD}` } },
    views: [{ showGridLines: false }],
  });
  summary.columns = [
    { width: 30 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  summary.mergeCells("A1:E1");
  const title = summary.getCell("A1");
  title.value = `${siteConfig.legalName.toUpperCase()} — ${facts.title.toUpperCase()}`;
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${INK}` } };
  title.alignment = { vertical: "middle", indent: 1 };
  summary.getRow(1).height = 34;

  summary.mergeCells("A2:E2");
  const period = summary.getCell("A2");
  period.value = `${facts.period}   ·   generated ${dmyTime(new Date())}`;
  period.font = { size: 10, color: { argb: "FFC9C0B2" } };
  period.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${INK}` } };
  period.alignment = { vertical: "middle", indent: 1 };
  summary.getRow(2).height = 20;
  summary.addRow([]);

  sectionTitle(summary, "AT A GLANCE");
  const kpiRows: Array<[string, number | string, string]> = [
    ["Revenue", facts.kpis.revenue, "Bills and orders in the period, cancelled ones left out"],
    ["Sales", facts.kpis.sales, "Counter bills and website orders together"],
    ["Average sale", facts.kpis.averageSale, ""],
    ["Items sold", facts.kpis.itemsSold, "Net of anything returned"],
    ["Collected", facts.kpis.collected, "Money that actually came in, refunds netted off"],
    ["Refunded", facts.kpis.refunded, ""],
    ["Still to collect", facts.kpis.outstanding, "Balances owed on part-paid bills"],
    ["Discounts given", facts.kpis.discounts, "Line and bill discounts together"],
    ["Cancelled", facts.kpis.cancelled, "Bills and orders cancelled in the period"],
    ["New website accounts", facts.kpis.newAccounts, ""],
  ];
  miniHead(summary, ["Measure", "Value", "", "Note"]);
  kpiRows.forEach(([label, value, note]) => {
    const row = summary.addRow([label, value, "", note]);
    row.getCell(1).font = { bold: true };
    if (typeof value === "number" && !Number.isInteger(value) || ["Revenue", "Average sale", "Collected", "Refunded", "Still to collect", "Discounts given"].includes(label)) {
      row.getCell(2).numFmt = "#,##0.00";
    }
    row.getCell(2).alignment = { horizontal: "right" };
    row.getCell(4).font = { color: { argb: `FF${MUTED}` }, size: 9 };
  });
  summary.addRow([]);

  sectionTitle(summary, "WHERE THE SALES CAME FROM");
  miniHead(summary, ["Channel", "Sales", "Revenue", "Collected", "Share"]);
  facts.channels.byChannel.forEach((row) => {
    const added = summary.addRow([
      row.channel === "POS" ? "Walk-in (counter)" : "Website",
      row.orders,
      round2(row.revenue),
      round2(row.collected),
      facts.kpis.revenue ? round2(row.revenue / facts.kpis.revenue) : 0,
    ]);
    added.getCell(3).numFmt = "#,##0.00";
    added.getCell(4).numFmt = "#,##0.00";
    added.getCell(5).numFmt = "0%";
  });
  summary.addRow([]);

  sectionTitle(summary, "HOW THE MONEY CAME IN");
  miniHead(summary, ["Method", "Collected", "Refunded", "Net"]);
  if (facts.channels.byMethod.length === 0) {
    summary.addRow(["No payments recorded"]);
  }
  facts.channels.byMethod.forEach((row) => {
    const added = summary.addRow([
      METHOD_LABEL[row.method] || row.method,
      round2(row.collected),
      round2(row.refunded),
      round2(row.net),
    ]);
    [2, 3, 4].forEach((c) => (added.getCell(c).numFmt = "#,##0.00"));
  });
  summary.addRow([]);

  sectionTitle(summary, "WHO BILLED WHAT AT THE COUNTER");
  miniHead(summary, ["Cashier", "Bills", "Billed", "Collected"]);
  if (facts.channels.byCashier.length === 0) {
    summary.addRow(["No counter bills in this period"]);
  }
  facts.channels.byCashier.forEach((row) => {
    const added = summary.addRow([row.name, row.bills, round2(row.billed), round2(row.collected)]);
    [3, 4].forEach((c) => (added.getCell(c).numFmt = "#,##0.00"));
  });
  summary.addRow([]);

  sectionTitle(summary, "ORDER STATUS");
  miniHead(summary, ["Status", "Count", "Share"]);
  facts.statusRows.forEach((row) => {
    const added = summary.addRow([row.status, row.count, row.share / 100]);
    added.getCell(3).numFmt = "0.0%";
  });

  // -------------------------------------------------------------- Daily
  const dailySheet = workbook.addWorksheet("Daily", {
    properties: { tabColor: { argb: `FF${GOLD}` } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  dailySheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Website orders", key: "webOrders", width: 15 },
    { header: "Website revenue", key: "web", width: 17 },
    { header: "Counter bills", key: "counterBills", width: 14 },
    { header: "Counter revenue", key: "counter", width: 17 },
    { header: "Total revenue", key: "total", width: 16 },
    { header: "Collected", key: "collected", width: 15 },
    { header: "Items", key: "items", width: 9 },
  ];
  headerRow(dailySheet);
  facts.daily.forEach((row) => {
    dailySheet.addRow({ ...row, date: dayLabel(row.date) });
  });
  const dailyTotal = dailySheet.addRow({
    date: "TOTAL",
    webOrders: facts.daily.reduce((s, r) => s + r.webOrders, 0),
    web: round2(facts.daily.reduce((s, r) => s + r.web, 0)),
    counterBills: facts.daily.reduce((s, r) => s + r.counterBills, 0),
    counter: round2(facts.daily.reduce((s, r) => s + r.counter, 0)),
    total: round2(facts.daily.reduce((s, r) => s + r.total, 0)),
    collected: round2(facts.daily.reduce((s, r) => s + r.collected, 0)),
    items: facts.daily.reduce((s, r) => s + r.items, 0),
  });
  dailyTotal.font = { bold: true };
  dailyTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GOLD_SOFT}` } };
  moneyColumns(dailySheet, ["web", "counter", "total", "collected"]);
  zebra(dailySheet, 2);

  // -------------------------------------------------------------- Sales
  const sales = workbook.addWorksheet("Sales", {
    properties: { tabColor: { argb: `FF${GREEN}` } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sales.columns = [
    { header: "Number", key: "number", width: 22 },
    { header: "Date", key: "date", width: 18 },
    { header: "Where", key: "channel", width: 11 },
    { header: "Customer", key: "customer", width: 24 },
    { header: "Contact", key: "contact", width: 24 },
    { header: "Cashier", key: "cashier", width: 16 },
    { header: "Items", key: "items", width: 8 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Total", key: "total", width: 14 },
    { header: "Paid", key: "paid", width: 14 },
    { header: "Balance", key: "balance", width: 13 },
    { header: "Payment", key: "paymentStatus", width: 11 },
    { header: "Method", key: "method", width: 13 },
    { header: "Status", key: "status", width: 12 },
  ];
  headerRow(sales);
  facts.orders.forEach((order) => {
    sales.addRow({
      number: order.orderNumber,
      date: dmyTime(order.createdAt),
      channel: order.channel === "POS" ? "Walk-in" : "Website",
      customer: orderCustomerName(order),
      contact: orderCustomerEmail(order) || order.billingPhone || "",
      cashier: order.createdBy?.name || "",
      items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: round2(order.subtotal),
      discount: round2(order.discountAmount),
      total: round2(order.totalAmount),
      paid: round2(order.amountPaid),
      balance: round2(Math.max(0, order.totalAmount - order.amountPaid)),
      paymentStatus: PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus,
      method: METHOD_LABEL[order.paymentMethod || ""] || order.paymentMethod || "",
      status: STATUS_LABEL[order.status] || order.status,
    });
  });
  moneyColumns(sales, ["subtotal", "discount", "total", "paid", "balance"]);
  sales.autoFilter = { from: "A1", to: "O1" };
  zebra(sales, 2);

  // --------------------------------------------------------- Items sold
  const lines = workbook.addWorksheet("Items sold", {
    properties: { tabColor: { argb: `FF${GREEN}` } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  lines.columns = [
    { header: "Number", key: "number", width: 22 },
    { header: "Date", key: "date", width: 14 },
    { header: "Where", key: "channel", width: 11 },
    { header: "Item", key: "item", width: 34 },
    { header: "Code", key: "sku", width: 14 },
    { header: "Colour", key: "colour", width: 12 },
    { header: "Qty", key: "qty", width: 7 },
    { header: "Returned", key: "returned", width: 10 },
    { header: "Unit price", key: "unit", width: 13 },
    { header: "Line discount", key: "lineDiscount", width: 13 },
    { header: "Line total", key: "lineTotal", width: 14 },
  ];
  headerRow(lines);
  facts.orders
    .filter((order) => order.status !== "CANCELLED")
    .forEach((order) => {
      order.items.forEach((item) => {
        const unit = item.discountedPrice ?? item.price;
        lines.addRow({
          number: order.orderNumber,
          date: dmy(order.createdAt),
          channel: order.channel === "POS" ? "Walk-in" : "Website",
          item: orderLineName(item),
          sku: item.product?.sku || "",
          colour: item.color || "",
          qty: item.quantity,
          returned: item.returnedQty,
          unit: round2(unit),
          lineDiscount: round2(item.lineDiscount || 0),
          lineTotal: round2(unit * item.quantity - (item.lineDiscount || 0)),
        });
      });
    });
  moneyColumns(lines, ["unit", "lineDiscount", "lineTotal"]);
  lines.autoFilter = { from: "A1", to: "K1" };
  zebra(lines, 2);

  // ------------------------------------------------------- Top products
  const top = workbook.addWorksheet("Top products", {
    properties: { tabColor: { argb: `FF${GOLD}` } },
  });
  top.columns = [
    { header: "#", key: "rank", width: 6 },
    { header: "Product", key: "name", width: 36 },
    { header: "Code", key: "sku", width: 18 },
    { header: "Category", key: "category", width: 18 },
    { header: "Sold", key: "sold", width: 9 },
    { header: "Revenue", key: "revenue", width: 15 },
  ];
  headerRow(top);
  facts.topProducts.forEach((row) => top.addRow(row));
  moneyColumns(top, ["revenue"]);
  zebra(top, 2);

  // -------------------------------------------------------------- Stock
  const stock = workbook.addWorksheet("Stock", {
    properties: { tabColor: { argb: `FF${RED}` } },
    views: [{ state: "frozen", ySplit: 1 }],
  });
  stock.columns = [
    { header: "Product", key: "name", width: 36 },
    { header: "Code", key: "sku", width: 18 },
    { header: "Category", key: "category", width: 18 },
    { header: "Price", key: "price", width: 13 },
    { header: "In stock", key: "stock", width: 10 },
    { header: "Status", key: "status", width: 14 },
    { header: "Times sold", key: "orders", width: 11 },
  ];
  headerRow(stock);
  [...data.products]
    .sort((a, b) => a.stock - b.stock)
    .forEach((product) => {
      const row = stock.addRow({
        name: product.title,
        sku: product.slug,
        category: product.category?.name || "",
        price: round2(product.price),
        stock: product.stock,
        status:
          product.stock <= 0
            ? "Out of stock"
            : product.stock <= 10
              ? "Running low"
              : product.status === "ACTIVE"
                ? "In stock"
                : product.status,
        orders: product._count.orderItems,
      });
      if (product.stock <= 0) {
        row.getCell(6).font = { color: { argb: `FF${RED}` }, bold: true };
      } else if (product.stock <= 10) {
        row.getCell(6).font = { color: { argb: "FF916312" }, bold: true };
      }
    });
  moneyColumns(stock, ["price"]);
  stock.autoFilter = { from: "A1", to: "G1" };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// =================================================================== PDF

type RGB = [number, number, number];

const loadLogo = async (): Promise<string | null> => {
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), "public", "images", "logo", "logo-dark-bg.png"),
    );
    return `data:image/png;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
};

export async function renderPdfReport(
  range: ReportRangeInfo,
  data: ReportDataset,
  channels: ChannelSummary,
): Promise<Buffer> {
  const facts = deriveFacts(range, data, channels);
  const logo = await loadLogo();

  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mx = 14;
  const contentW = pageW - mx * 2;

  const ink = rgb(INK);
  const gold = rgb(GOLD);
  const muted = rgb(MUTED);
  const sand = rgb(SAND);
  const rule = rgb(RULE);
  const ivory = rgb(IVORY);

  const text = (color: RGB, size: number, style: "normal" | "bold" = "normal") => {
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
  };

  // ------------------------------------------------------------ masthead
  // The same dark band the invoice wears, so every document the shop prints
  // is recognisably the same shop's.
  const masthead = (subtitle: string) => {
    doc.setFillColor(ink[0], ink[1], ink[2]);
    doc.rect(0, 0, pageW, 30, "F");

    let textX = mx;
    if (logo) {
      // The lockup is 867×983; a 22mm-tall box keeps its shape.
      const h = 22;
      doc.addImage(logo, "PNG", mx, 4, h * (867 / 983), h, undefined, "FAST");
      textX = mx + h * (867 / 983) + 5;
    }
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, 30, pageW, 1.2, "F");
    text([192, 156, 108], 7, "bold");
    doc.text(siteConfig.tagline.toUpperCase(), textX, 12, { charSpace: 0.5 });
    text([255, 255, 255], 14, "bold");
    doc.text(siteConfig.legalName.toUpperCase(), textX, 19, { charSpace: 0.3 });
    text([201, 192, 178], 7.5);
    doc.text(siteConfig.contact.address, textX, 24.5);

    text([192, 156, 108], 7, "bold");
    doc.text(facts.title.toUpperCase(), pageW - mx, 12, { align: "right", charSpace: 0.5 });
    text([255, 255, 255], 11, "bold");
    doc.text(facts.period, pageW - mx, 19, { align: "right" });
    text([201, 192, 178], 7.5);
    doc.text(subtitle, pageW - mx, 24.5, { align: "right" });
  };

  const footer = (page: number, total: number) => {
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.3);
    doc.line(mx, pageH - 12, pageW - mx, pageH - 12);
    text(muted, 7.5);
    doc.text(
      `${siteConfig.legalName} · ${siteConfig.contact.phone} · ${siteConfig.contact.email}`,
      mx,
      pageH - 8,
    );
    doc.text(`Generated ${dmyTime(new Date())}`, pageW / 2, pageH - 8, { align: "center" });
    doc.text(`Page ${page} of ${total}`, pageW - mx, pageH - 8, { align: "right" });
  };

  const heading = (label: string, y: number) => {
    text(gold, 7.5, "bold");
    doc.text(label.toUpperCase(), mx, y, { charSpace: 0.6 });
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.3);
    doc.line(mx, y + 2, pageW - mx, y + 2);
    return y + 7;
  };

  const tableStyle = {
    theme: "plain" as const,
    styles: { fontSize: 8, cellPadding: 2, textColor: ink, lineWidth: 0 },
    headStyles: { fillColor: sand, textColor: gold, fontStyle: "bold" as const, fontSize: 7.5 },
    alternateRowStyles: { fillColor: ivory },
    margin: { left: mx, right: mx },
  };

  // ================================================== PAGE 1: THE MONTH
  masthead("Overview");
  let y = 40;

  // KPI tiles: the six numbers the owner asks for first.
  const tiles: Array<{ label: string; value: string; note: string; tone?: RGB }> = [
    { label: "Revenue", value: moneyShort(facts.kpis.revenue), note: `${facts.kpis.sales} sales` },
    { label: "Collected", value: moneyShort(facts.kpis.collected), note: facts.kpis.refunded > 0 ? `${moneyShort(facts.kpis.refunded)} refunded` : "no refunds" },
    {
      label: "Still to collect",
      value: moneyShort(facts.kpis.outstanding),
      note: facts.kpis.outstanding > 0 ? "on part-paid bills" : "everything settled",
      tone: facts.kpis.outstanding > 0 ? rgb(RED) : rgb(GREEN),
    },
    { label: "Average sale", value: moneyShort(facts.kpis.averageSale), note: `${facts.kpis.itemsSold} items sold` },
    { label: "Discounts given", value: moneyShort(facts.kpis.discounts), note: "line and bill discounts" },
    { label: "Cancelled", value: String(facts.kpis.cancelled), note: `${facts.kpis.newAccounts} new website accounts` },
  ];
  const tileW = (contentW - 4 * 2) / 3;
  const tileH = 20;
  tiles.forEach((tile, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = mx + col * (tileW + 4);
    const ty = y + row * (tileH + 4);
    doc.setFillColor(ivory[0], ivory[1], ivory[2]);
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.roundedRect(x, ty, tileW, tileH, 2, 2, "FD");
    text(muted, 6.5, "bold");
    doc.text(tile.label.toUpperCase(), x + 4, ty + 6, { charSpace: 0.4 });
    text(tile.tone ?? ink, 12.5, "bold");
    doc.text(tile.value, x + 4, ty + 13);
    text(muted, 7);
    doc.text(tile.note, x + 4, ty + 17.5);
  });
  y += 2 * tileH + 4 + 10;

  // Daily takings chart: bars per shop day, in-store on top of website.
  y = heading("Takings per day", y);
  const chartH = 42;
  const chartTop = y;
  const chartBottom = y + chartH;
  const peak = Math.max(...facts.daily.map((row) => row.total), 0);
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  doc.setLineWidth(0.2);
  [0.25, 0.5, 0.75, 1].forEach((fraction) => {
    const gy = chartBottom - chartH * fraction;
    doc.line(mx, gy, pageW - mx, gy);
    if (peak > 0) {
      text(muted, 6);
      doc.text(moneyShort(peak * fraction), mx - 1, gy + 1.5, { align: "right" });
    }
  });
  doc.setLineWidth(0.4);
  doc.setDrawColor(ink[0], ink[1], ink[2]);
  doc.line(mx, chartBottom, pageW - mx, chartBottom);

  if (peak > 0) {
    const gap = facts.daily.length > 40 ? 0.4 : 1;
    const barW = (contentW - gap * (facts.daily.length - 1)) / facts.daily.length;
    facts.daily.forEach((row, index) => {
      const x = mx + index * (barW + gap);
      const webH = (row.web / peak) * chartH;
      const counterH = (row.counter / peak) * chartH;
      if (counterH > 0) {
        doc.setFillColor(gold[0], gold[1], gold[2]);
        doc.rect(x, chartBottom - counterH, barW, counterH, "F");
      }
      if (webH > 0) {
        doc.setFillColor(109, 69, 184);
        doc.rect(x, chartBottom - counterH - webH - (counterH > 0 ? 0.3 : 0), barW, webH, "F");
      }
    });
    // First, last, and the busiest day are labelled; the rest are in the sheet.
    text(muted, 6.5);
    doc.text(dayLabel(facts.daily[0].date), mx, chartBottom + 4);
    doc.text(dayLabel(facts.daily[facts.daily.length - 1].date), pageW - mx, chartBottom + 4, {
      align: "right",
    });
    if (facts.busiest && facts.busiest.total > 0) {
      text(ink, 7, "bold");
      doc.text(
        `Busiest: ${dayLabel(facts.busiest.date)} · ${moneyShort(facts.busiest.total)}`,
        pageW / 2,
        chartBottom + 4,
        { align: "center" },
      );
    }
  } else {
    text(muted, 8);
    doc.text("No sales in this period", pageW / 2, chartTop + chartH / 2, { align: "center" });
  }
  // legend
  const legendY = chartBottom + 9;
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(mx, legendY - 2.2, 3, 3, "F");
  text(muted, 7);
  doc.text("Walk-in", mx + 4.5, legendY);
  doc.setFillColor(109, 69, 184);
  doc.rect(mx + 22, legendY - 2.2, 3, 3, "F");
  doc.text("Website", mx + 26.5, legendY);
  y = legendY + 8;

  // Channels and payment methods, side by side.
  y = heading("Where the money came from", y);
  const halfW = (contentW - 6) / 2;
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Channel", "Sales", "Revenue", "Collected"]],
    body: facts.channels.byChannel.map((row) => [
      row.channel === "POS" ? "Walk-in" : "Website",
      String(row.orders),
      money(row.revenue),
      money(row.collected),
    ]),
    margin: { left: mx, right: mx + halfW + 6 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });
  const leftEnd = (doc as any).lastAutoTable?.finalY || y;
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Method", "Collected", "Refunded", "Net"]],
    body:
      facts.channels.byMethod.length > 0
        ? facts.channels.byMethod.map((row) => [
            METHOD_LABEL[row.method] || row.method,
            money(row.collected),
            money(row.refunded),
            money(row.net),
          ])
        : [["No payments recorded", "", "", ""]],
    margin: { left: mx + halfW + 6, right: mx },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });
  y = Math.max(leftEnd, (doc as any).lastAutoTable?.finalY || y) + 10;

  if (y < pageH - 60) {
    y = heading("Order status", y);
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [["Status", "Count", "Share"]],
      body: facts.statusRows.map((row) => [row.status, String(row.count), `${row.share.toFixed(1)}%`]),
      margin: { left: mx, right: mx + halfW + 6 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } },
    });
    const statusEnd = (doc as any).lastAutoTable?.finalY || y;
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [["Cashier", "Bills", "Billed", "Collected"]],
      body:
        facts.channels.byCashier.length > 0
          ? facts.channels.byCashier.map((row) => [
              row.name,
              String(row.bills),
              money(row.billed),
              money(row.collected),
            ])
          : [["No counter bills", "", "", ""]],
      margin: { left: mx + halfW + 6, right: mx },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = Math.max(statusEnd, (doc as any).lastAutoTable?.finalY || y);
  }

  // ============================================ PAGE 2: PRODUCTS & STOCK
  doc.addPage();
  masthead("Products and stock");
  y = 40;
  y = heading("Best sellers", y);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["#", "Product", "Code", "Category", "Sold", "Revenue"]],
    body:
      facts.topProducts.length > 0
        ? facts.topProducts.map((row) => [
            String(row.rank),
            row.name,
            row.sku,
            row.category,
            String(row.sold),
            money(row.revenue),
          ])
        : [["", "Nothing sold in this period", "", "", "", ""]],
    columnStyles: { 0: { cellWidth: 8 }, 4: { halign: "center" }, 5: { halign: "right" } },
  });
  y = ((doc as any).lastAutoTable?.finalY || y) + 10;

  y = heading("Running low or out of stock", y);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [["Product", "Code", "Category", "In stock", "Price"]],
    body:
      facts.lowStock.length > 0
        ? facts.lowStock.slice(0, 40).map((product) => [
            product.title,
            product.slug,
            product.category?.name || "",
            product.stock <= 0 ? "Out" : String(product.stock),
            money(product.price),
          ])
        : [["Nothing is running low", "", "", "", ""]],
    columnStyles: { 3: { halign: "center" }, 4: { halign: "right" } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 3 && hook.cell.raw === "Out") {
        hook.cell.styles.textColor = rgb(RED);
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });
  if (facts.lowStock.length > 40) {
    y = ((doc as any).lastAutoTable?.finalY || y) + 4;
    text(muted, 7.5);
    doc.text(`… and ${facts.lowStock.length - 40} more in the spreadsheet`, mx, y);
  }

  // ================================================ PAGE 3+: EVERY SALE
  doc.addPage();
  masthead("Every sale in the period");
  autoTable(doc, {
    ...tableStyle,
    startY: 40,
    head: [["Number", "Date", "Where", "Customer", "Total", "Paid", "Balance", "Status"]],
    body: facts.orders.map((order) => [
      order.orderNumber,
      dmy(order.createdAt),
      order.channel === "POS" ? "Walk-in" : "Website",
      orderCustomerName(order),
      money(order.totalAmount),
      money(order.amountPaid),
      order.totalAmount - order.amountPaid > 0.01
        ? money(order.totalAmount - order.amountPaid)
        : "—",
      order.status === "CANCELLED"
        ? "Cancelled"
        : PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus,
    ]),
    styles: { ...tableStyle.styles, fontSize: 7.2, cellPadding: 1.6 },
    columnStyles: {
      0: { cellWidth: 34 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: mx, right: mx, top: 40, bottom: 18 },
    didDrawPage: (hook) => {
      if (hook.pageNumber > 1) masthead("Every sale in the period (continued)");
    },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 6 && hook.cell.raw !== "—") {
        hook.cell.styles.textColor = rgb(RED);
      }
      if (hook.section === "body" && hook.column.index === 7 && hook.cell.raw === "Cancelled") {
        hook.cell.styles.textColor = rgb(MUTED);
      }
    },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    footer(page, pages);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
