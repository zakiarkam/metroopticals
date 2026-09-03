import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "@/features/orders/types/order";
import { siteConfig } from "@/config/site";
import {
  orderLineLensName,
  orderLineName,
} from "@/features/orders/utils/order-display";
import { describeEye } from "@/features/lenses/utils/prescription";
import { ONLINE_PAYMENT_FEE_LABEL } from "@/features/checkout/utils/payment-fee";

type BusinessDetails = {
  legalName: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankAccountName: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  invoiceNote: string;
};

const FALLBACK_BUSINESS: BusinessDetails = {
  legalName: siteConfig.legalName,
  registrationNumber: "",
  address: siteConfig.contact.address,
  phone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  website: siteConfig.domain,
  bankAccountName: siteConfig.banking.accountName,
  bankName: siteConfig.banking.bank,
  bankBranch: siteConfig.banking.branch,
  bankAccountNumber: siteConfig.banking.accountNumber,
  invoiceNote: "Thank you for shopping with Metro Opticals.",
};

const fetchBusinessDetails = async (): Promise<BusinessDetails> => {
  try {
    const response = await fetch("/api/site-content/business.details", {
      cache: "no-store",
    });
    const payload = await response.json();
    const block = payload?.data?.block ?? payload?.block;
    if (!block) return FALLBACK_BUSINESS;
    return { ...FALLBACK_BUSINESS, ...block };
  } catch {
    return FALLBACK_BUSINESS;
  }
};

type RGB = [number, number, number];
const CHARCOAL: RGB = [26, 26, 26];
const GOLD: RGB = [143, 106, 55];
const INK: RGB = [36, 36, 36];
const MUTED: RGB = [110, 110, 110];
const RULE: RGB = [225, 221, 214];
const PANEL: RGB = [248, 246, 242];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [34, 139, 84];

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

const clean = (value?: string | null) =>
  (value ?? "").replace(/\s+/g, " ").trim();

/** "Nawalapitiya 20650, Sri Lanka", skipping whichever parts are missing. */
const cityLine = (
  city?: string | null,
  postalCode?: string | null,
  country?: string | null,
) => {
  const locality = [clean(city), clean(postalCode)].filter(Boolean).join(" ");
  return [locality, clean(country)].filter(Boolean).join(", ");
};

const loadImage = async (
  path: string,
  maxWidthPx: number,
): Promise<string | null> => {
  try {
    const blob = await (await fetch(path)).blob();
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

const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");

export const downloadOrderReceiptPdf = async (order: Order) => {
  const [business, logo] = await Promise.all([
    fetchBusinessDetails(),
    loadImage(siteConfig.logoOnDark, 400),
  ]);

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
    doc.text(business.legalName, mx, 22);
  }

  setText(WHITE, 22, "bold");
  doc.text("INVOICE", pageW - mx, 17, { align: "right" });
  setText([200, 200, 200], 9);
  doc.text(`Invoice no.  ${order.orderNumber}`, pageW - mx, 25, { align: "right" });
  doc.text(`Date  ${longDate(order.createdAt)}`, pageW - mx, 30.5, { align: "right" });
  setText(GOLD, 8.5, "bold");
  doc.text(statusLabel(order.status).toUpperCase(), pageW - mx, 36, { align: "right" });

  /* -------------------------------------------------- parties (3 columns) */
  let y = headerH + 12;
  const colW = (contentW - 8) / 3;
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
        order.billingName,
        order.billingAddress,
        cityLine(order.billingCity, order.billingPostalCode, order.billingCountry),
        order.billingPhone,
        order.billingEmail,
      ].map(clean).filter(Boolean),
    },
    // A counter sale ships nowhere, so the column is left off entirely rather
    // than printed empty.
    ...(clean(order.shippingName) || clean(order.shippingAddress)
      ? [
          {
            title: "Ship to",
            lines: [
              order.shippingName,
              order.shippingAddress,
              cityLine(
                order.shippingCity,
                order.shippingPostalCode,
                order.shippingCountry,
              ),
              order.shippingPhone,
            ].map(clean).filter(Boolean),
          },
        ]
      : []),
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
  const hasDiscounts = order.items.some(
    (item) => item.discountedPrice != null && item.discountedPrice < item.price,
  );
  const totalDiscount = order.items.reduce((acc, item) => {
    if (item.discountedPrice != null && item.discountedPrice < item.price) {
      acc += (item.price - item.discountedPrice) * item.quantity;
    }
    return acc;
  }, 0);

  const rows = order.items.map((item, index) => {
    // Frame plus lenses: one saleable thing at one price, so the unit price
    // column has to carry both or the amounts will not add up to the total.
    const lensPrice = item.lensPrice ?? 0;
    const net = (item.discountedPrice ?? item.price) + lensPrice;
    const gross = item.price + lensPrice;

    // The lenses and the powers they were made to are printed on the invoice
    // rather than left to the shop's screen: this is the document a customer
    // takes to another optician when they want the same again.
    const lines = [clean(orderLineName(item))];
    if (item.color) lines.push(item.color);

    const lensName = orderLineLensName(item);
    if (lensName) {
      lines.push(clean(lensName));
      if (item.lensRx) {
        lines.push(
          clean(
            `OD ${describeEye(item.lensRx.right ?? {})}  OS ${describeEye(item.lensRx.left ?? {})}`,
          ),
        );
      }
    }

    const base = [
      String(index + 1),
      lines.join("\n"),
      String(item.quantity),
      money(gross),
    ];
    return hasDiscounts
      ? [...base, money(net), money(net * item.quantity)]
      : [...base, money(net * item.quantity)];
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
  const totalLines: { label: string; value: string; color?: RGB }[] = [
    { label: "Subtotal", value: money(order.subtotal) },
  ];
  if (hasDiscounts && totalDiscount > 0) {
    totalLines.push({ label: "Discount", value: `- ${money(totalDiscount)}`, color: GREEN });
  }
  totalLines.push({
    label: order.shippingMethod === "pickup" ? "Collection" : "Delivery",
    value: order.shippingFee > 0 ? money(order.shippingFee) : "Free",
  });
  // Named on its own line rather than folded into the goods, so the customer
  // can see exactly what paying by card added.
  if ((order.paymentFee ?? 0) > 0) {
    totalLines.push({
      label: ONLINE_PAYMENT_FEE_LABEL,
      value: money(order.paymentFee as number),
    });
  }

  const totalsBlockH = totalLines.length * 6 + 12;
  if (y + totalsBlockH + 50 > pageH) {
    doc.addPage();
    y = 20;
  }

  // Amounts sit 4mm in from the right edge so the figures never touch the
  // page margin; the label column starts at the same inset.
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
  doc.text(money(order.totalAmount), amountX, y, { align: "right" });
  y += 18;

  /* ----------------------------------------------------- payment panel */
  const bankLines = [
    business.bankAccountName && `Account name: ${business.bankAccountName}`,
    business.bankName && `Bank: ${business.bankName}`,
    business.bankBranch && `Branch: ${business.bankBranch}`,
    business.bankAccountNumber && `Account no.: ${business.bankAccountNumber}`,
  ].filter(Boolean) as string[];

  const noteLines = business.invoiceNote
    ? (doc.splitTextToSize(clean(business.invoiceNote), contentW - 12) as string[])
    : [];

  const panelH = 14 + Math.max(bankLines.length, 1) * 4.6 + (noteLines.length ? noteLines.length * 4.2 + 4 : 0);
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
    `${(order.paymentMethod || "Not specified").replace(/_/g, " ").toUpperCase()}`,
    mx + 28,
    py,
  );
  py += 6;

  if (bankLines.length) {
    setText(GOLD, 7.5, "bold");
    doc.text("BANK TRANSFER", mx + 6, py);
    setText(MUTED, 8.5);
    bankLines.forEach((line, i) => doc.text(line, mx + 34, py + i * 4.6));
    py += bankLines.length * 4.6 + 2;
  } else {
    py += 1;
  }

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
    doc.text(business.legalName, mx, fy + 5.5);
    setText(MUTED, 7.8);
    doc.text(
      [business.phone, business.email, business.website].filter(Boolean).join("   ·   "),
      mx,
      fy + 10,
    );
    doc.text(`Page ${p} of ${pages}`, pageW - mx, fy + 10, { align: "right" });
  }

  doc.save(`Invoice-${order.orderNumber.replace(/\//g, "-")}.pdf`);
};
