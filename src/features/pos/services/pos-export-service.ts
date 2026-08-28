import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { SaleQueryInput } from "@/features/pos/validators/pos";
import { shopRange } from "@/features/pos/utils/shop-time";
import {
  roundMoney,
  savedLineTotal,
  savedLineUnitPrice,
} from "@/features/pos/utils/bill";
import { PAYMENT_STATUS_LABELS } from "@/features/pos/types/pos";

/**
 * The sales list as a spreadsheet, filtered exactly as it is on screen.
 *
 * Two sheets: one row per bill for totalling, and one row per line for anyone
 * who needs to see what actually went out of the door.
 */

const HEADER_FILL = "FF8F6A37";

const styleHeader = (sheet: ExcelJS.Worksheet) => {
  const row = sheet.getRow(1);
  row.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_FILL },
  };
  row.height = 20;
};

export async function buildSalesWorkbook(query: SaleQueryInput): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  const where: Prisma.OrderWhereInput = {};

  if (query.channel !== "ALL") where.channel = query.channel;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.status) where.status = query.status;
  if (query.cashierId) where.createdById = query.cashierId;
  if (query.paymentMethod) where.payments = { some: { method: query.paymentMethod } };

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
    ];
  }

  const sales = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: { select: { title: true, sku: true } } } },
      payments: { select: { method: true, amount: true } },
      customer: { select: { name: true, phone: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    // A month of counter bills is a few hundred rows; this is the safety rail
    // against someone exporting the whole history by accident.
    take: 5000,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Metro Opticals";
  workbook.created = new Date();

  // ------------------------------------------------------------- bills
  const billsSheet = workbook.addWorksheet("Bills", {
    properties: { tabColor: { argb: HEADER_FILL } },
  });
  billsSheet.columns = [
    { header: "Bill", key: "orderNumber", width: 24 },
    { header: "Date", key: "date", width: 20 },
    { header: "Customer", key: "customer", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Cashier", key: "cashier", width: 18 },
    { header: "Items", key: "items", width: 8 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Total", key: "total", width: 14 },
    { header: "Paid", key: "paid", width: 14 },
    { header: "Balance", key: "balance", width: 14 },
    { header: "Payment", key: "paymentStatus", width: 12 },
    { header: "Method", key: "method", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeader(billsSheet);

  sales.forEach((sale) => {
    billsSheet.addRow({
      orderNumber: sale.orderNumber,
      date: sale.createdAt.toLocaleString("en-GB"),
      customer: sale.customer?.name || sale.billingName,
      phone: sale.customer?.phone || sale.billingPhone || "",
      cashier: sale.createdBy?.name || "",
      items: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: roundMoney(sale.subtotal),
      discount: roundMoney(sale.discountAmount),
      total: roundMoney(sale.totalAmount),
      paid: roundMoney(sale.amountPaid),
      balance: roundMoney(Math.max(0, sale.totalAmount - sale.amountPaid)),
      paymentStatus:
        PAYMENT_STATUS_LABELS[sale.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ||
        sale.paymentStatus,
      method: sale.paymentMethod || "",
      status: sale.voidedAt ? "Cancelled" : sale.status,
    });
  });

  ["G", "H", "I", "J", "K"].forEach((column) => {
    billsSheet.getColumn(column).numFmt = "#,##0.00";
  });

  // A totals row, because the first thing anyone does with this is add it up.
  const live = sales.filter((sale) => sale.status !== "CANCELLED");
  billsSheet.addRow({});
  const totals = billsSheet.addRow({
    orderNumber: "TOTAL",
    items: live.reduce(
      (sum, sale) => sum + sale.items.reduce((n, item) => n + item.quantity, 0),
      0,
    ),
    total: roundMoney(live.reduce((sum, sale) => sum + sale.totalAmount, 0)),
    paid: roundMoney(live.reduce((sum, sale) => sum + sale.amountPaid, 0)),
    balance: roundMoney(
      live.reduce(
        (sum, sale) => sum + Math.max(0, sale.totalAmount - sale.amountPaid),
        0,
      ),
    ),
  });
  totals.font = { bold: true };

  // -------------------------------------------------------------- lines
  const linesSheet = workbook.addWorksheet("Items sold", {
    properties: { tabColor: { argb: "FF2E7D4F" } },
  });
  linesSheet.columns = [
    { header: "Bill", key: "orderNumber", width: 24 },
    { header: "Date", key: "date", width: 20 },
    { header: "Item", key: "item", width: 34 },
    { header: "Code", key: "sku", width: 16 },
    { header: "Colour", key: "colour", width: 14 },
    { header: "Qty", key: "quantity", width: 8 },
    { header: "Returned", key: "returned", width: 10 },
    { header: "Unit", key: "unit", width: 12 },
    { header: "Line total", key: "lineTotal", width: 14 },
  ];
  styleHeader(linesSheet);

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const unit = savedLineUnitPrice(item);
      linesSheet.addRow({
        orderNumber: sale.orderNumber,
        date: sale.createdAt.toLocaleString("en-GB"),
        item: item.title || item.product?.title || "Item",
        sku: item.product?.sku || "",
        colour: item.color || "",
        quantity: item.quantity,
        returned: item.returnedQty,
        unit: roundMoney(unit),
        lineTotal: savedLineTotal(item),
      });
    });
  });

  ["H", "I"].forEach((column) => {
    linesSheet.getColumn(column).numFmt = "#,##0.00";
  });

  const label =
    query.startDate && query.endDate
      ? `${query.startDate}_to_${query.endDate}`
      : query.startDate || query.endDate || "all";

  return {
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    filename: `counter-sales-${label}.xlsx`,
  };
}
