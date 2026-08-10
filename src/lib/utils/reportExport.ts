"use client";

import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportExportPayload } from "@/features/reports/types/report";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDateDMY = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatDateTimeDMY = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const loadLogoData = async (): Promise<string | null> => {
  try {
    const response = await fetch("/images/logo/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const maxWidthPx = 240;
    const scale = Math.min(1, maxWidthPx / imageBitmap.width);
    const targetWidth = Math.round(imageBitmap.width * scale);
    const targetHeight = Math.round(imageBitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
};

export const exportReportPdf = async (
  reportData: ReportExportPayload
): Promise<Blob> => {
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

  const logoDataUrl = await loadLogoData();
  const rangeLabel = `${formatDateDMY(reportData.range.startDate)} - ${formatDateDMY(
    reportData.range.endDate
  )}`;

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
      reportData.range.isCustomRange ? "SALES REPORT" : "MONTHLY REPORT",
      pageWidth - marginX,
      16,
      { align: "right" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(`Report Period: ${rangeLabel}`, pageWidth - marginX, 21, {
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

  addHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Key Performance Metrics", marginX, 40);

  const summary = reportData.summary;
  const summaryRows = [
    ["Total Revenue", formatNumber(summary.totalRevenue)],
    ["Total Orders", summary.totalOrders.toString()],
    ["Average Order Value", formatNumber(summary.avgOrderValue)],
    ["New Customers", summary.newCustomers.toString()],
    ["Total Products", summary.totalProducts.toString()],
  ];

  autoTable(doc, {
    startY: 44,
    head: [["Metric", "Value"]],
    body: summaryRows,
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Order Status Breakdown", pageWidth / 2 + 4, 40);

  const statusRows = reportData.statusBreakdown.map((status) => {
    const percent =
      summary.totalOrders > 0 ? (status.count / summary.totalOrders) * 100 : 0;
    return [status.status, status.count.toString(), `${percent.toFixed(1)}%`];
  });

  autoTable(doc, {
    startY: 44,
    head: [["Status", "Count", "%"]],
    body: statusRows,
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

  const topProductsY =
    Math.max(
      (doc as any).lastAutoTable?.finalY || 0,
      44 + summaryRows.length * 7
    ) + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Top 10 Products", marginX, topProductsY);

  autoTable(doc, {
    startY: topProductsY + 4,
    head: [["#", "Product", "SKU", "Category", "Sold", "Revenue"]],
    body: reportData.topProducts.map((product, index) => [
      (index + 1).toString(),
      product.name,
      product.sku,
      product.category,
      product.sold.toString(),
      formatNumber(product.revenue),
    ]),
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

  doc.addPage();
  addHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text("Recent Orders", marginX, 40);

  autoTable(doc, {
    startY: 44,
    head: [["#", "Order #", "Customer", "Status", "Items", "Total", "Date"]],
    body: reportData.orders
      .slice(0, 25)
      .map((order, index) => [
        (index + 1).toString(),
        order.orderNumber,
        order.customerName,
        order.status,
        order.itemsCount.toString(),
        formatNumber(order.totalAmount),
        formatDateDMY(order.createdAt),
      ]),
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

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
};

export const exportReportExcel = async (
  reportData: ReportExportPayload
): Promise<Blob> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Metro Opticals";
  workbook.created = new Date();
  workbook.company = "Metro Opticals";

  const summarySheet = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF4F46E5" } },
  });

  summarySheet.mergeCells("A1:D1");
  summarySheet.getCell("A1").value = reportData.range.isCustomRange
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

  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value = `Period: ${formatDateDMY(
    reportData.range.startDate
  )} - ${formatDateDMY(reportData.range.endDate)}`;
  summarySheet.getCell("A2").font = { size: 11, italic: true };
  summarySheet.getCell("A2").alignment = { horizontal: "center" };
  summarySheet.getRow(2).height = 20;

  summarySheet.addRow([]);

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

  const summary = reportData.summary;
  summarySheet.addRows([
    [
      "Total Revenue",
      formatNumber(summary.totalRevenue),
      "",
      summary.statusBreakdown[0]?.status || "N/A",
      summary.statusBreakdown[0]?.count || 0,
    ],
    [
      "Total Orders",
      summary.totalOrders,
      "",
      summary.statusBreakdown[1]?.status || "N/A",
      summary.statusBreakdown[1]?.count || 0,
    ],
    [
      "Average Order Value",
      formatNumber(summary.avgOrderValue),
      "",
      summary.statusBreakdown[2]?.status || "N/A",
      summary.statusBreakdown[2]?.count || 0,
    ],
    [
      "New Customers",
      summary.newCustomers,
      "",
      summary.statusBreakdown[3]?.status || "N/A",
      summary.statusBreakdown[3]?.count || 0,
    ],
    [
      "Total Products",
      summary.totalProducts,
      "",
      summary.statusBreakdown[4]?.status || "N/A",
      summary.statusBreakdown[4]?.count || 0,
    ],
  ]);

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

  reportData.orders.forEach((order, index) => {
    ordersSheet.addRow({
      no: index + 1,
      orderNumber: order.orderNumber,
      customer: order.customerName,
      email: order.customerEmail,
      status: order.status,
      items: order.itemsCount,
      total: formatNumber(order.totalAmount),
      date: formatDateTimeDMY(order.createdAt),
    });
  });

  for (let i = 2; i <= ordersSheet.rowCount; i++) {
    if (i % 2 === 0) {
      ordersSheet.getRow(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    }
  }

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

  reportData.products.forEach((product, index) => {
    productsSheet.addRow({
      no: index + 1,
      name: product.title,
      sku: product.sku,
      category: product.category,
      price: formatNumber(product.price),
      stock: product.stock,
      status: product.status,
      orders: product.ordersCount,
    });
  });

  for (let i = 2; i <= productsSheet.rowCount; i++) {
    if (i % 2 === 0) {
      productsSheet.getRow(i).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
