import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { siteConfig } from "@/config/site";
import type { BusinessDetails } from "@/features/pos/components/receipt/BillReceipt";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Sale,
} from "@/features/pos/types/pos";
import {
  roundMoney,
  savedLineTotal,
  savedLineUnitPrice,
} from "@/features/pos/utils/bill";

/**
 * The A4 invoice for a counter bill.
 *
 * Deliberately the same document as the website's invoice
 * (`src/lib/utils/orderReceiptPdf.ts`)  same charcoal header and gold rule,
 * same three-column parties block, same black table head, same totals and
 * payment panel  so a customer who buys online one month and over the
 * counter the next holds two invoices that are obviously from one shop. What
 * differs is only what a counter sale has that a web order does not: money
 * already paid, a balance still owed, and the date it is due.
 */

type RGB = [number, number, number];
const CHARCOAL: RGB = [26, 26, 26];
const GOLD: RGB = [143, 106, 55];
const INK: RGB = [36, 36, 36];
const MUTED: RGB = [110, 110, 110];
const RULE: RGB = [225, 221, 214];
const PANEL: RGB = [248, 246, 242];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [34, 139, 84];
const RED: RGB = [158, 31, 36];

const money = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const longDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const clean = (value?: string | null) => (value ?? "").replace(/\s+/g, " ").trim();

const lineName = (item: Sale["items"][number]) =>
  clean(item.title || item.product?.title) || "Item";

/** The logo lockup, rasterised in the browser so jsPDF can embed it. */
const loadLogo = async (maxWidthPx: number): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  try {
    const blob = await (await fetch(siteConfig.logoOnDark)).blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxWidthPx / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
};

export async function buildBillPdf(
  sale: Sale,
  business: BusinessDetails,
  logoOverride?: string | null,
): Promise<jsPDF> {
  const logo = logoOverride === undefined ? await loadLogo(400) : logoOverride;

  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mx = 16;
  const contentW = pageW - mx * 2;

  const setText = (color: RGB, size: number, style: "normal" | "bold" = "normal") => {
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
  };

  const balance = roundMoney(Math.max(0, sale.totalAmount - sale.amountPaid));
  const owing = balance > 0.01;

  /* ------------------------------------------------------------ header */
  const headerH = 40;
  doc.setFillColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.rect(0, 0, pageW, headerH, "F");
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, headerH, pageW, 1.2, "F");

  if (logo) {
    // Lockup is roughly 867×983; keep it inside a 26mm-tall box.
    const h = 26;
    const w = h * (867 / 983);
    doc.addImage(logo, "PNG", mx, 7, w, h, undefined, "FAST");
  } else {
    setText(WHITE, 18, "bold");
    doc.text(clean(business.legalName) || siteConfig.legalName, mx, 22);
  }

  setText(WHITE, 22, "bold");
  doc.text("INVOICE", pageW - mx, 17, { align: "right" });
  setText([200, 200, 200], 9);
  doc.text(`Invoice no.  ${sale.orderNumber}`, pageW - mx, 25, { align: "right" });
  doc.text(`Date  ${longDate(sale.createdAt)}`, pageW - mx, 30.5, { align: "right" });
  setText(sale.voidedAt ? [224, 90, 95] : GOLD, 8.5, "bold");
  doc.text(
    (sale.voidedAt
      ? "Cancelled"
      : PAYMENT_STATUS_LABELS[sale.paymentStatus] ?? sale.paymentStatus
    ).toUpperCase(),
    pageW - mx,
    36,
    { align: "right" },
  );

  /* -------------------------------------------------- parties (3 columns) */
  let y = headerH + 12;
  const colW = (contentW - 8) / 3;
  const methods = Array.from(
    new Set(
      (sale.payments || [])
        .filter((payment) => payment.amount > 0)
        .map((payment) => PAYMENT_METHOD_LABELS[payment.method] ?? payment.method),
    ),
  );
  const columns: { title: string; lines: string[] }[] = [
    {
      title: "From",
      lines: [
        business.legalName,
        ...(business.registrationNumber ? [`Reg. no. ${business.registrationNumber}`] : []),
        business.address,
        business.phone,
        business.email,
        business.website,
      ].map(clean).filter(Boolean),
    },
    {
      title: "Bill to",
      lines: [
        sale.billingName || "Walk-in customer",
        sale.billingAddress,
        sale.billingCity,
        sale.billingPhone,
        sale.billingEmail,
      ].map(clean).filter(Boolean),
    },
    {
      title: "Sale",
      lines: [
        "Walk-in · shop counter",
        sale.createdBy?.name ? `Served by ${clean(sale.createdBy.name)}` : "",
        methods.length ? `Paid by ${methods.join(", ")}` : "Nothing collected yet",
        sale.status === "PROCESSING" ? "Awaiting collection" : "",
      ].filter(Boolean),
    },
  ];

  let partiesBottom = y;
  columns.forEach((col, i) => {
    const x = mx + i * (colW + 4);
    setText(GOLD, 7.5, "bold");
    doc.text(col.title.toUpperCase(), x, y);
    let ly = y + 5;
    col.lines.forEach((line, li) => {
      setText(li === 0 ? INK : MUTED, li === 0 ? 9.5 : 8.5, li === 0 ? "bold" : "normal");
      const wrapped = doc.splitTextToSize(line, colW) as string[];
      doc.text(wrapped, x, ly);
      ly += wrapped.length * 4.2;
    });
    partiesBottom = Math.max(partiesBottom, ly);
  });

  y = partiesBottom + 4;
  doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
  doc.setLineWidth(0.3);
  doc.line(mx, y, pageW - mx, y);
  y += 8;

  /* ------------------------------------------------------------- items */
  // A line shows a "net price" column only when something on the bill was
  // charged below its catalogue price  the same rule the website invoice uses.
  const hasDiscounts = sale.items.some(
    (item) =>
      (item.discountedPrice != null && item.discountedPrice !== item.price) ||
      (item.lineDiscount || 0) > 0,
  );

  const rows = sale.items.map((item, index) => {
    const unit = savedLineUnitPrice(item);
    const label = [
      lineName(item),
      item.color ? `\n${item.color}` : "",
      (item.lineDiscount || 0) > 0 ? `\n${money(item.lineDiscount)} off this line` : "",
      item.returnedQty > 0 ? `\n${item.returnedQty} returned` : "",
    ].join("");
    const base = [String(index + 1), label, String(item.quantity), money(item.price)];
    return hasDiscounts
      ? [...base, money(unit), money(savedLineTotal(item))]
      : [...base, money(savedLineTotal(item))];
  });

  autoTable(doc, {
    startY: y,
    head: [
      hasDiscounts
        ? ["#", "Item", "Qty", "Unit price", "Net price", "Amount"]
        : ["#", "Item", "Qty", "Unit price", "Amount"],
    ],
    body: rows,
    theme: "plain",
    margin: { left: mx, right: mx },
    styles: {
      font: "helvetica",
      fontSize: 8.8,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      textColor: INK,
      lineColor: RULE,
      lineWidth: { bottom: 0.2 },
      valign: "middle",
    },
    headStyles: {
      fillColor: CHARCOAL,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      lineWidth: 0,
    },
    columnStyles: hasDiscounts
      ? {
          0: { cellWidth: 9, textColor: MUTED },
          2: { cellWidth: 14, halign: "center" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        }
      : {
          0: { cellWidth: 9, textColor: MUTED },
          2: { cellWidth: 14, halign: "center" },
          3: { cellWidth: 32, halign: "right" },
          4: { cellWidth: 34, halign: "right", fontStyle: "bold" },
        },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index >= 2) {
        data.cell.styles.halign = data.column.index === 2 ? "center" : "right";
      }
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;

  /* ------------------------------------------------------------ totals */
  const totalsW = 78;
  const totalsX = pageW - mx - totalsW;
  const itemsTotal = roundMoney(
    sale.items.reduce((sum, item) => sum + savedLineTotal(item), 0),
  );
  const returnedValue = roundMoney(itemsTotal - sale.subtotal);

  const totalLines: { label: string; value: string; color?: RGB }[] = [
    { label: "Items", value: money(itemsTotal) },
  ];
  if (returnedValue > 0.01) {
    totalLines.push({ label: "Returned", value: `- ${money(returnedValue)}` });
    totalLines.push({ label: "Subtotal", value: money(sale.subtotal) });
  }
  if (sale.discountAmount > 0) {
    totalLines.push({
      label: "Discount",
      value: `- ${money(sale.discountAmount)}`,
      color: GREEN,
    });
  }

  const paidLines = (sale.payments || []).map((payment) => ({
    label:
      payment.amount < 0
        ? "Refunded"
        : `Paid · ${PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}`,
    value: `${payment.amount < 0 ? "- " : ""}${money(Math.abs(payment.amount))}`,
  }));

  const totalsBlockH = (totalLines.length + paidLines.length) * 6.5 + 40;
  if (y + totalsBlockH + 50 > pageH) {
    doc.addPage();
    y = 20;
  }

  const amountX = pageW - mx - 4;
  totalLines.forEach((line) => {
    setText(MUTED, 9);
    doc.text(line.label, totalsX, y);
    setText(line.color ?? INK, 9, "bold");
    doc.text(line.value, amountX, y, { align: "right" });
    y += 6.5;
  });

  y += 1;
  doc.setDrawColor(CHARCOAL[0], CHARCOAL[1], CHARCOAL[2]);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y, pageW - mx, y);
  y += 7;
  setText(INK, 10, "bold");
  doc.text("Total", totalsX, y);
  setText(INK, 13, "bold");
  doc.text(money(sale.totalAmount), amountX, y, { align: "right" });
  y += 8;

  // What has been collected, and what is still owed  the part a web invoice
  // never needs.
  paidLines.forEach((line) => {
    setText(MUTED, 9);
    doc.text(line.label, totalsX, y);
    setText(INK, 9, "bold");
    doc.text(line.value, amountX, y, { align: "right" });
    y += 6.5;
  });

  if (owing) {
    y += 1;
    doc.setFillColor(253, 237, 238);
    doc.roundedRect(totalsX - 2, y - 5, totalsW + 2, 9, 1.5, 1.5, "F");
    setText(RED, 9.5, "bold");
    doc.text("Balance due", totalsX, y + 1);
    setText(RED, 11, "bold");
    doc.text(money(balance), amountX, y + 1, { align: "right" });
    y += 8;
  } else if (paidLines.length) {
    setText(GREEN, 8.5, "bold");
    doc.text("SETTLED", amountX, y, { align: "right" });
    y += 6;
  }
  y += 10;

  /* ----------------------------------------------------- payment panel */
  const dueLine = owing
    ? sale.balanceDueDate
      ? `Balance of ${money(balance)} to be settled by ${longDate(sale.balanceDueDate)}.`
      : `Balance of ${money(balance)} to be settled on collection.`
    : "";
  const collectLine =
    sale.status === "PROCESSING"
      ? "Your order is being prepared. Please bring this invoice when you collect."
      : "";
  const noteLines = business.invoiceNote
    ? (doc.splitTextToSize(clean(business.invoiceNote), contentW - 12) as string[])
    : [];
  const extraLines = [dueLine, collectLine].filter(Boolean);

  const panelH =
    14 + extraLines.length * 4.8 + (noteLines.length ? noteLines.length * 4.2 + 4 : 0);
  if (y + panelH + 24 > pageH) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(PANEL[0], PANEL[1], PANEL[2]);
  doc.roundedRect(mx, y, contentW, panelH, 2, 2, "F");
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(mx, y, 1.2, panelH, "F");

  let py = y + 7;
  setText(GOLD, 7.5, "bold");
  doc.text("PAYMENT", mx + 6, py);
  setText(INK, 9, "bold");
  doc.text(
    (methods.length ? methods.join(" + ") : "Not yet paid").toUpperCase(),
    mx + 28,
    py,
  );
  py += 6;

  extraLines.forEach((line) => {
    setText(owing ? RED : MUTED, 8.5, owing ? "bold" : "normal");
    doc.text(line, mx + 6, py);
    py += 4.8;
  });

  if (noteLines.length) {
    setText(MUTED, 8.2);
    doc.text(noteLines, mx + 6, py + 2);
  }

  /* ------------------------------------------------------------ footer */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    const fy = pageH - 14;
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.3);
    doc.line(mx, fy, pageW - mx, fy);
    setText(INK, 8.5, "bold");
    doc.text(clean(business.legalName) || siteConfig.legalName, mx, fy + 5.5);
    setText(MUTED, 7.8);
    doc.text(
      [business.phone, business.email, business.website].filter(Boolean).join("   ·   "),
      mx,
      fy + 10,
    );
    doc.text(`Page ${p} of ${pages}`, pageW - mx, fy + 10, { align: "right" });
  }

  return doc;
}

/** Filename-safe bill number: `25/08/2026/POS/17` → `Invoice-25-08-2026-POS-17.pdf`. */
export const billPdfFilename = (sale: Sale) =>
  `Invoice-${sale.orderNumber.replace(/\//g, "-")}.pdf`;

export async function downloadBillPdf(sale: Sale, business: BusinessDetails) {
  (await buildBillPdf(sale, business)).save(billPdfFilename(sale));
}
