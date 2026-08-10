import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "@/features/orders/types/order";
import { siteConfig } from "@/config/site";

const COMPANY = {
  name: siteConfig.legalName,
  address: siteConfig.contact.address,
  phone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  website: siteConfig.domain,
  logoPath: siteConfig.logo,
};

const BANKING = {
  name: siteConfig.banking.accountName,
  account: siteConfig.banking.accountNumber,
  bank: siteConfig.banking.bank,
  branch: siteConfig.banking.branch,
};

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const safeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const loadImageData = async (
  path: string,
  maxWidthPx: number
): Promise<{ dataUrl: string; format: "PNG" } | null> => {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const scale = Math.min(1, maxWidthPx / imageBitmap.width);
    const targetWidth = Math.round(imageBitmap.width * scale);
    const targetHeight = Math.round(imageBitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL("image/png");
    return { dataUrl, format: "PNG" };
  } catch {
    return null;
  }
};

export const downloadOrderReceiptPdf = async (order: Order) => {
  const doc = new jsPDF({
    format: "a5",
    orientation: "landscape",
    unit: "mm",
  });

  const marginX = 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = 8;
  const lightGray: [number, number, number] = [245, 245, 245];
  const midGray: [number, number, number] = [120, 120, 120];
  const darkGray: [number, number, number] = [40, 40, 40];

  const logoImage = await loadImageData(COMPANY.logoPath, 300);
  if (logoImage?.dataUrl) {
    doc.addImage(
      logoImage.dataUrl,
      logoImage.format,
      marginX,
      cursorY - 2,
      24,
      12,
      undefined,
      "FAST"
    );
  }

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(COMPANY.name, marginX + 30, cursorY + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.text(COMPANY.address, marginX + 30, cursorY + 7);
  doc.text(`${COMPANY.phone} | ${COMPANY.email}`, marginX + 30, cursorY + 11);

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INVOICE", pageWidth - marginX, cursorY + 2, {
    align: "right",
  });
  doc.setFontSize(7.5);
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`#${order.orderNumber}`, pageWidth - marginX, cursorY + 7, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.text(formatDateTime(order.createdAt), pageWidth - marginX, cursorY + 11, {
    align: "right",
  });

  cursorY += 16;
  doc.setLineWidth(0.4);
  doc.setDrawColor(70, 70, 70);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 4;

  const billLine = safeLine(
    `${order.billingName} | ${order.billingAddress}, ${order.billingCity} ${
      order.billingPostalCode || ""
    }, ${order.billingCountry} | ${order.billingPhone} | ${order.billingEmail}`
  );
  const shipLine = safeLine(
    `${order.shippingName} | ${order.shippingAddress}, ${order.shippingCity} ${
      order.shippingPostalCode || ""
    }, ${order.shippingCountry} | ${order.shippingPhone} | ${
      order.shippingEmail
    }`
  );

  doc.setFontSize(8.2);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.text(billLine, marginX + 18, cursorY);

  cursorY += 5;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text("SHIP TO:", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.text(shipLine, marginX + 18, cursorY);

  cursorY += 5;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text("BANKING DETAILS:", marginX, cursorY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.text(
    `${BANKING.name} | Account Number: ${BANKING.account} | Bank: ${BANKING.bank} | Branch: ${BANKING.branch}`,
    marginX + 33,
    cursorY
  );

  cursorY += 6;

  const hasDiscounts = order.items.some(
    (item) => item.discountedPrice != null && item.discountedPrice < item.price
  );

  const totalDiscount = order.items.reduce((acc, item) => {
    if (item.discountedPrice != null && item.discountedPrice < item.price) {
      acc += (item.price - item.discountedPrice) * item.quantity;
    }
    return acc;
  }, 0);

  const rows = order.items.map((item, index) => {
    const netPrice = item.discountedPrice ?? item.price;
    const discount =
      item.discountedPrice != null && item.discountedPrice < item.price
        ? item.price - item.discountedPrice
        : 0;

    if (hasDiscounts) {
      return [
        String(index + 1),
        safeLine(item.product.title),
        item.product.slug || "-",
        String(item.quantity),
        formatPrice(item.price),
        discount > 0 ? `-${formatPrice(discount)}` : "-",
        formatPrice(netPrice),
        formatPrice(netPrice * item.quantity),
      ];
    }

    return [
      String(index + 1),
      safeLine(item.product.title),
      item.product.slug || "-",
      String(item.quantity),
      formatPrice(item.price),
      formatPrice(netPrice * item.quantity),
    ];
  });

  const tableHead = hasDiscounts
    ? [["#", "PRODUCT", "SKU CODE", "QTY", "UNIT PRICE", "DISCOUNT", "NET PRICE", "TOTAL"]]
    : [["#", "PRODUCT", "SKU CODE", "QTY", "PRICE", "TOTAL"]];

  const columnStyles = hasDiscounts
    ? {
        0: { cellWidth: 6 },
        2: { cellWidth: 24 },
        3: { cellWidth: 8 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
      }
    : {
        0: { cellWidth: 6 },
        2: { cellWidth: 30 },
        3: { cellWidth: 10 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      };

  autoTable(doc, {
    startY: cursorY,
    head: tableHead,
    body: rows,
    theme: "plain",
    styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0 },
    showHead: "everyPage",
    headStyles: {
      fillColor: lightGray,
      textColor: darkGray,
      lineWidth: 0,
      fontStyle: "bold",
    },
    margin: { left: marginX, right: marginX },
    pageBreak: "auto",
    rowPageBreak: "auto",
    columnStyles,
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.fontStyle = "bold";
      }
      // Highlight discount column in green
      if (
        hasDiscounts &&
        data.section === "body" &&
        data.column.index === 5 &&
        data.cell.text[0] !== "-"
      ) {
        data.cell.styles.textColor = [34, 173, 92]; // green
      }
    },
  });

  const drawFooter = (pageNumber: number, totalPages: number) => {
    const footerTop = pageHeight - 8;

    doc.setLineWidth(0.4);
    doc.setDrawColor(70, 70, 70);
    doc.line(marginX, footerTop - 3, pageWidth - marginX, footerTop - 3);

    doc.setFontSize(8.2);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Thank you for your business!", pageWidth / 2, footerTop + 0.5, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(
      `Questions? Contact ${COMPANY.email} | ${COMPANY.phone} | ${COMPANY.website}`,
      pageWidth / 2,
      footerTop + 3.5,
      { align: "center" }
    );

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(midGray[0], midGray[1], midGray[2]);
    doc.text(
      `Page ${pageNumber} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 2,
      { align: "center" }
    );
  };

  const tableFinalY = (doc as any).lastAutoTable?.finalY ?? cursorY + 10;
  const footerHeight = 20;
  const totalsHeight = hasDiscounts && totalDiscount > 0 ? 21 : 16;
  let totalsY = tableFinalY + 6;

  if (totalsY + totalsHeight + footerHeight > pageHeight) {
    doc.addPage();
    totalsY = 14;
  }

  doc.setFontSize(8.2);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text(
    `PAYMENT: ${(order.paymentMethod || "").toUpperCase()}`,
    marginX,
    totalsY
  );
  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text(`STATUS: ${order.status}`, marginX, totalsY + 5);

  doc.setTextColor(midGray[0], midGray[1], midGray[2]);
  doc.setFontSize(8.2);
  doc.text(
    `Subtotal: ${formatPrice(order.subtotal)}`,
    pageWidth - marginX,
    totalsY,
    { align: "right" }
  );

  let totalBoxOffsetY = 2.5;
  if (hasDiscounts && totalDiscount > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(34, 173, 92);
    doc.text(
      `You saved: -Rs ${formatPrice(totalDiscount)}`,
      pageWidth - marginX,
      totalsY + 5,
      { align: "right" }
    );
    totalBoxOffsetY = 8;
  }

  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(pageWidth - marginX - 60, totalsY + totalBoxOffsetY, 60, 7.5, "F");
  doc.setFontSize(9.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont("helvetica", "bold");
  doc.text(
    `TOTAL: Rs ${formatPrice(order.totalAmount)}`,
    pageWidth - marginX,
    totalsY + totalBoxOffsetY + 5.5,
    { align: "right" }
  );

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    drawFooter(pageNumber, totalPages);
  }

  doc.save(`Order-${order.orderNumber}.pdf`);
};
