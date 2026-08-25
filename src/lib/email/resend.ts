import { Resend } from "resend";
import { siteConfig } from "@/config/site";

export const isResendConfigured = () =>
  !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith("re_");

let resendClient: Resend | null = null;

const getResend = (): Resend => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY, or set USE_MOCK_EMAIL=true to log emails instead of sending them.",
    );
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

/** Proxy so existing `resend.emails.send(...)` call sites keep working. */
const resend = {
  get emails() {
    return getResend().emails;
  },
};

type OrderItem = {
  quantity: number;
  price: number; // unit price
  color?: string | null; // the colourway as sold
  product?: {
    title?: string;
    imageUrl?: string; // single image URL (legacy support)
    images?: string[]; // array of image filenames from database
    catalogueFile?: string; // catalogue PDF filename
    size?: string; // optional (if you have it)
  };
};

export type OrderDetails = {
  billingName: string;
  billingEmail: string;
  billingPhone?: string;

  shippingName?: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingCountry?: string;

  notes?: string;

  items: OrderItem[];

  totalAmount?: number;

  // optional
  discountAmount?: number; // subtract
  shippingAmount?: number; // add
};

function escapeHtml(input: unknown) {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ensureAbsoluteUrl(url: string | undefined, baseUrl: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function normalizeBaseUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function getEmailBaseUrl() {
  return normalizeBaseUrl(
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      "https://metroopticals.lk") as string,
  ).replace(/\/$/, "");
}

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(
  /\/+$/,
  "",
);

function getProductImageUrl(fileName: string | undefined): string {
  if (!fileName) return "";
  // If already a full URL, return as-is
  if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
    return fileName;
  }
  return `${R2_PUBLIC_URL}/product/image/${fileName}`;
}

function getProductCatalogueUrl(fileName: string | undefined): string {
  if (!fileName) return "";
  if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
    return fileName;
  }
  return `${R2_PUBLIC_URL}/product/catalogue/${fileName}`;
}

function formatMoney(amount: number, currency?: string) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `Rs ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)}`;
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buttonPill({
  href,
  label,
  bgColor = "#A17C4C",
  textColor = "#ffffff",
}: {
  href: string;
  label: string;
  bgColor?: string;
  textColor?: string;
}) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);

  return `
  <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeHref}"
      style="height:46px;v-text-anchor:middle;width:260px;" arcsize="50%"
      strokecolor="${bgColor}" fillcolor="${bgColor}">
      <w:anchorlock/>
      <center style="color:${textColor};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;">
        ${safeLabel}
      </center>
    </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-- -->
    <a href="${safeHref}" target="_blank"
      style="display:inline-block;background:${bgColor};color:${textColor};
      text-decoration:none;padding:14px 28px;border-radius:999px;
      font-family:Poppins,Arial,Helvetica,sans-serif;font-size:17px;font-weight:500;line-height:24px;">
      ${safeLabel}
    </a>
  <!--<![endif]-->
  `;
}

function calcSubtotal(items: OrderItem[]) {
  return items.reduce((sum, it) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.price || 0);
    return sum + qty * price;
  }, 0);
}

const BRAND = {
  name: siteConfig.name,
  logoPath: siteConfig.logo,
  supportEmail: siteConfig.contact.email,
  supportPhone: siteConfig.contact.phoneHref.replace("tel:", ""),
  supportPhoneLabel: siteConfig.contact.phone,
};

// Reusable header (same across all emails)
function renderEmailHeaderRow({
  baseUrl,
  rightLabel,
  rightHref,
}: {
  baseUrl: string;
  rightLabel: string;
  rightHref: string;
}) {
  const logoUrl = ensureAbsoluteUrl(BRAND.logoPath, baseUrl);
  return `
  <tr>
    <td style="padding:20px 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="left" valign="middle">
            <img src="${escapeHtml(logoUrl)}" width="160" alt="${escapeHtml(
              BRAND.name,
            )}"
              style="display:block;border:0;outline:0;width:160px;height:auto;max-width:100%;" />
          </td>
          <td align="right" valign="middle" style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:14px;">
            <a href="${escapeHtml(rightHref)}" target="_blank" style="color:#1A1A1A;text-decoration:none;">
              ${escapeHtml(rightLabel)}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  `;
}

// Reusable footer (same across all emails)
function renderEmailFooterRow() {
  const year = new Date().getFullYear();
  return `
  <tr>
    <td style="background:#1A1A1A;padding:30px;text-align:center;">
      <p style="margin:0 0 10px;font-size:16px;color:#ffffff;font-weight:500;">
        ${escapeHtml(BRAND.name)}
      </p>
      <p style="margin:0 0 15px;font-size:14px;color:#B5AEA2;">
        ${escapeHtml(siteConfig.tagline)}
      </p>
      <p style="margin:0;font-size:13px;color:#B5AEA2;">
        Email: <a href="mailto:${escapeHtml(
          BRAND.supportEmail,
        )}" style="color:#B5AEA2;text-decoration:none;">${escapeHtml(
          BRAND.supportEmail,
        )}</a>
        &nbsp;|&nbsp;
        Phone: <a href="tel:${escapeHtml(
          BRAND.supportPhone,
        )}" style="color:#B5AEA2;text-decoration:none;">${escapeHtml(
          BRAND.supportPhoneLabel,
        )}</a>
      </p>
      <p style="margin:15px 0 0;font-size:12px;color:#6b7280;">
        © ${year} ${escapeHtml(BRAND.name)}. All rights reserved.
      </p>
    </td>
  </tr>
  `;
}

// One consistent outer shell for ALL emails
function renderEmailShell({
  title,
  preheader,
  baseUrl,
  headerRightLabel,
  headerRightHref,
  innerHtml,
}: {
  title: string;
  preheader: string;
  baseUrl: string;
  headerRightLabel: string;
  headerRightHref: string;
  innerHtml: string; // must be <tr>...</tr> rows
}) {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${escapeHtml(title)}</title>

  <link href="https://fonts.googleapis.com/css?family=Poppins:ital,wght@0,400;0,500;0,600" rel="stylesheet" />

  <!--[if mso]>
    <style>
      body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
      img { -ms-interpolation-mode: bicubic; }
    </style>
  <![endif]-->
</head>

<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          ${renderEmailHeaderRow({
            baseUrl,
            rightLabel: headerRightLabel,
            rightHref: headerRightHref,
          })}

          ${innerHtml}

          ${renderEmailFooterRow()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Render customer order confirmation email with latest UI improvements
function renderCustomerOrderEmail({
  baseUrl,
  orderNumber,
  orderId,
  order,
}: {
  baseUrl: string;
  orderNumber: string;
  orderId: number | string;
  order: OrderDetails;
}) {
  const safeOrderNo = escapeHtml(orderNumber);
  const safeBillingName = escapeHtml(order.billingName || "Customer");

  const orderUrl = `${baseUrl}/order-confirmation?orderId=${encodeURIComponent(
    String(orderId),
  )}`;

  const innerHtml = `
    <tr>
      <td style="padding:40px 30px;font-family:Poppins,Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 20px;font-size:18px;color:#1A1A1A;">
          Hi ${safeBillingName},
        </p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">
          Thanks for your order. We are packing it now and will notify you once it ships.
        </p>

        <div style="margin:24px 0 0;padding:20px;background:#d1fae5;border-left:4px solid #10b981;border-radius:6px;">
          <p style="margin:0;font-size:14px;color:#666;">
            <strong style="color:#10b981;">Order Number:</strong>
          </p>
          <p style="margin:8px 0 0;font-size:20px;font-weight:600;color:#1A1A1A;">
            ${safeOrderNo}
          </p>
        </div>

        <div style="margin-top:26px;text-align:center;">
          ${buttonPill({ href: orderUrl, label: "View Order Details" })}
        </div>

        <div style="margin-top:26px;padding:20px;background:#f9fafb;border-radius:6px;">
          <p style="margin:0 0 10px;font-size:14px;color:#666;">
            <strong>Need Help?</strong>
          </p>
          <p style="margin:0;font-size:14px;color:#666;">
            If you have any questions, please
            <a href="${escapeHtml(
              `${baseUrl}/contact`,
            )}" style="color:#A17C4C;text-decoration:none;">contact our support team</a>
            or reply to this email.
          </p>
        </div>
      </td>
    </tr>
  `;

  return renderEmailShell({
    title: "Order Confirmation",
    preheader: `Thanks for your order #${orderNumber}. We are packing it now.`,
    baseUrl,
    headerRightLabel: "Contact Us",
    headerRightHref: `mailto:${BRAND.supportEmail}`,
    innerHtml,
  });
}

function renderOrderStatusUpdateEmail({
  baseUrl,
  name,
  orderNumber,
  status,
}: {
  baseUrl: string;
  name?: string;
  orderNumber: string;
  status: "SHIPPED" | "CANCELLED";
}) {
  const displayName = escapeHtml(name || "Valued customer");
  const safeOrderNo = escapeHtml(orderNumber);

  const contactUrl = `${baseUrl}/contact`;
  const ordersUrl = `${baseUrl}/my-account/orders`;

  const isShipped = status === "SHIPPED";

  const statusTitle = isShipped ? "Order Shipped" : "Order Cancelled";
  const statusColor = isShipped ? "#10b981" : "#ef4444";
  const statusBg = isShipped ? "#d1fae5" : "#fee2e2";

  const messageHtml = isShipped
    ? `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">
        Great news! Your order <strong>${safeOrderNo}</strong> has been shipped and is on its way to you.
      </p>
    `
    : `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">
        We're sorry to let you know that your order <strong>${safeOrderNo}</strong> has been cancelled.
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">
        If you believe this is a mistake or would like help placing the order again, please contact our support team.
      </p>
    `;

  const innerHtml = `
    <tr>
      <td style="background:#F7F2E9;border-radius:12px;padding:36px 24px;text-align:center;">
        <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:28px;font-weight:600;color:#1A1A1A;letter-spacing:-0.03em;">
          ${escapeHtml(statusTitle)}
        </div>
        <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#53627a;margin-top:10px;">
          Order <b>#${safeOrderNo}</b>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:34px 30px;font-family:Poppins,Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 18px;font-size:18px;color:#1A1A1A;">
          Hi ${displayName},
        </p>

        ${messageHtml}

        <div style="margin:26px 0 0;padding:20px;background:${statusBg};border-left:4px solid ${statusColor};border-radius:6px;">
          <p style="margin:0;font-size:14px;color:#666;">
            <strong style="color:${statusColor};">Order Number:</strong>
          </p>
          <p style="margin:8px 0 0;font-size:20px;font-weight:600;color:#1A1A1A;">
            ${safeOrderNo}
          </p>
        </div>

        <div style="margin-top:26px;text-align:center;">
          ${buttonPill({ href: ordersUrl, label: "View Order Details" })}
        </div>

        <div style="margin-top:26px;padding:20px;background:#f9fafb;border-radius:6px;">
          <p style="margin:0 0 10px;font-size:14px;color:#666;">
            <strong>Need Help?</strong>
          </p>
          <p style="margin:0;font-size:14px;color:#666;">
            If you have any questions, please
            <a href="${escapeHtml(
              contactUrl,
            )}" style="color:#A17C4C;text-decoration:none;">contact our support team</a>
            or reply to this email.
          </p>
        </div>
      </td>
    </tr>
  `;

  return renderEmailShell({
    title: statusTitle,
    preheader: `${statusTitle} for order #${orderNumber}`,
    baseUrl,
    headerRightLabel: "Contact Us",
    headerRightHref: `mailto:${BRAND.supportEmail}`,
    innerHtml,
  });
}

export async function sendOrderStatusUpdateEmail({
  email,
  name,
  orderNumber,
  status,
}: {
  email: string;
  name?: string;
  orderNumber: string;
  status: "SHIPPED" | "CANCELLED";
}) {
  if (!isResendConfigured()) throw new Error("Resend API key not configured");

  const baseUrl = getEmailBaseUrl();

  const emailFrom =
    process.env.EMAIL_FROM || "Metro Opticals <noreply@metroopticals.lk>";

  const subject =
    status === "SHIPPED"
      ? `Your order ${orderNumber} is on its way! - Metro Opticals`
      : `Order ${orderNumber} cancelled - Metro Opticals`;

  const html = renderOrderStatusUpdateEmail({
    baseUrl,
    name,
    orderNumber,
    status,
  });

  return resend.emails.send({
    from: emailFrom,
    to: email,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!isResendConfigured()) throw new Error("Resend API key not configured");

  const emailFrom =
    process.env.EMAIL_FROM || "Metro Opticals <noreply@metroopticals.lk>";

  const baseUrl = getEmailBaseUrl();

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(
    token,
  )}`;

  const safeEmail = escapeHtml(email);
  const safeResetUrl = escapeHtml(resetUrl);

  const innerHtml = `
    <tr>
      <td style="background:#F7F2E9;border-radius:12px;padding:40px 24px;text-align:center;">
        <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:34px;font-weight:600;color:#1A1A1A;letter-spacing:-0.03em;">
          Reset Your Password
        </div>
        <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#1A1A1A;margin-top:12px;max-width:520px;margin-left:auto;margin-right:auto;">
          We received a request to reset the password for your Metro Opticals account:
          <span style="font-weight:600;color:#1A1A1A;">${safeEmail}</span>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:22px 20px;background:#F7F2E9;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:18px 16px;font-family:Poppins,Arial,Helvetica,sans-serif;color:#1A1A1A;">
              <div style="font-size:16px;font-weight:600;color:#1A1A1A;line-height:1.6;">
                Click the button below to reset your password.
              </div>

              <div style="margin-top:14px;text-align:center;">
                ${buttonPill({ href: resetUrl, label: "🔒 Reset Password" })}
              </div>

              <div style="margin-top:14px;font-size:13px;color:#53627a;line-height:1.7;">
                If the button doesn’t work, copy and paste this link into your browser:
              </div>

              <div style="margin-top:10px;padding:12px;background:#f9fafb;border-left:4px solid #A17C4C;border-radius:12px;">
                <a href="${safeResetUrl}" style="color:#A17C4C;text-decoration:underline;word-break:break-all;font-size:13px;">
                  ${safeResetUrl}
                </a>
              </div>

              <div style="margin-top:14px;background:#fff7ed;border-left:4px solid #f59e0b;border-radius:12px;padding:12px;">
                <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">
                  ⚠️ Security Notice
                </div>
                <div style="font-size:13px;line-height:1.7;color:#78350f;">
                  • This link expires in <b>1 hour</b><br/>
                  • If you didn’t request this reset, ignore this email<br/>
                  • Your password won’t change until you set a new one
                </div>
              </div>

              <div style="margin-top:26px;padding:20px;background:#f9fafb;border-radius:6px;">
                <p style="margin:0 0 10px;font-size:14px;color:#666;">
                  <strong>Need Help?</strong>
                </p>
                <p style="margin:0;font-size:14px;color:#666;">
                  If you have any questions, please
                  <a href="${escapeHtml(
                    `${baseUrl}/contact`,
                  )}" style="color:#A17C4C;text-decoration:none;">contact our support team</a>
                  or reply to this email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const html = renderEmailShell({
    title: "Reset Your Password",
    preheader: `Reset your Metro Opticals password for ${email}.`,
    baseUrl,
    headerRightLabel: "Contact Us",
    headerRightHref: `mailto:${BRAND.supportEmail}`,
    innerHtml,
  });

  const data = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: "Reset Your Password - Metro Opticals",
    html,
  });

  return data;
}

function renderWelcomeEmail({
  baseUrl,
  name,
  email,
}: {
  baseUrl: string;
  name?: string;
  email: string;
}) {
  const safeName = escapeHtml(name || "Valued customer");
  const safeEmail = escapeHtml(email);

  const loginUrl = `${baseUrl}/log-in`;
  const shopUrl = baseUrl;
  const supportUrl = `${baseUrl}/contact`;

  const safeLoginUrl = escapeHtml(loginUrl);
  const safeShopUrl = escapeHtml(shopUrl);
  const safeSupportUrl = escapeHtml(supportUrl);

  const innerHtml = `
    <!-- Hero -->
    <tr>
      <td style="background:#F7F2E9;border-radius:12px;padding:40px 24px;text-align:center;">
        <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:34px;font-weight:600;color:#1A1A1A;letter-spacing:-0.03em;">
          Welcome to Metro Opticals
        </div>
        <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin-top:14px;">
          Hi ${safeName}, we are thrilled you joined us. Everything you need for premium shopping is ready.
        </div>
        <p style="margin:18px auto 0;font-size:14px;line-height:1.7;color:#53627a;max-width:520px;">
          Explore curated collections, track your orders, and get support whenever you need it all from your Metro Opticals account.
        </p>
      </td>
    </tr>

    <!-- Feature steps -->
    <tr>
      <td style="padding:36px 20px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="width:33.33%;">
              <div style="background:#10b981;width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:table;">
                <span style="display:table-cell;vertical-align:middle;text-align:center;font-size:22px;color:#ffffff;">🛍️</span>
              </div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#10b981;font-weight:600;">Shop with ease</div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:11px;color:#6b7280;margin-top:4px;">Curated collections</div>
            </td>

            <td align="center" style="width:33.33%;">
              <div style="background:#f3f4f6;width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:table;border:3px dashed #d1d5db;">
                <span style="display:table-cell;vertical-align:middle;text-align:center;font-size:18px;">📦</span>
              </div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;font-weight:600;">Track orders</div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;margin-top:4px;">Order Updates</div>
            </td>

            <td align="center" style="width:33.33%;">
              <div style="background:#f3f4f6;width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:table;border:3px dashed #d1d5db;">
                <span style="display:table-cell;vertical-align:middle;text-align:center;font-size:18px;">💬</span>
              </div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;font-weight:600;">Always here</div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;margin-top:4px;">24/7 support</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Primary CTA -->
    <tr>
      <td style="padding:18px 0 8px;text-align:center;">
        ${buttonPill({ href: safeShopUrl, label: "Start Shopping" })}
      </td>
    </tr>

    <!-- Account details card -->
    <tr>
      <td style="padding:14px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#F7F2E9;border-radius:20px;padding:22px 18px;">
          <tr>
            <td style="font-family:Poppins,Arial,Helvetica,sans-serif;color:#1A1A1A;">
              <div style="font-size:18px;font-weight:600;letter-spacing:-0.03em;text-align:center;">
                Account Details
              </div>

              <div style="background:#ffffff;border-radius:12px;padding:14px;margin-top:14px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                      <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Name</div>
                      <div style="font-size:15px;font-weight:600;color:#1A1A1A;margin-top:4px;">${safeName}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                      <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Email</div>
                      <div style="font-size:15px;font-weight:600;color:#1A1A1A;margin-top:4px;">
                        <a href="mailto:${safeEmail}" style="color:#A17C4C;text-decoration:none;font-weight:600;">${safeEmail}</a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;">
                      <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Next step</div>
                      <div style="margin-top:4px;font-size:15px;font-weight:600;color:#1A1A1A;">
                        <a href="${safeLoginUrl}" style="color:#A17C4C;text-decoration:none;font-weight:600;">Log in to your account</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin-top:20px;padding:16px;background:#fff7ed;border-left:4px solid #f59e0b;border-radius:12px;font-size:13px;color:#78350f;line-height:1.6;">
                If you didn’t create this account, please
                <a href="${safeSupportUrl}" style="color:#f59e0b;text-decoration:none;font-weight:600;">contact us</a>
                immediately.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr><td style="height:16px;line-height:16px;font-size:1px;">&nbsp;</td></tr>
  `;

  return renderEmailShell({
    title: "Welcome to Metro Opticals",
    preheader: `Welcome to Metro Opticals, ${name || "Valued customer"}! Your new account is ready.`,
    baseUrl,
    headerRightLabel: "Contact Us",
    headerRightHref: safeSupportUrl, // right-side header link
    innerHtml,
  });
}

export async function sendWelcomeEmail(email: string, name?: string) {
  if (!isResendConfigured()) throw new Error("Resend API key not configured");

  const baseUrl = getEmailBaseUrl();

  const emailFrom =
    process.env.EMAIL_FROM || "Metro Opticals <noreply@metroopticals.lk>";

  const html = renderWelcomeEmail({ baseUrl, name, email });

  return resend.emails.send({
    from: emailFrom,
    to: email,
    subject: "Welcome to Metro Opticals!",
    html,
  });
}

////////
// Render customer order confirmation email with latest UI improvements
function renderAdminOrderEmail({
  baseUrl,
  orderNumber,
  order,
  currency = "USD",
}: {
  baseUrl: string;
  orderNumber: string;
  order: OrderDetails;
  currency?: string;
}) {
  const safeOrderNo = escapeHtml(orderNumber);

  // ✅ Must be publicly reachable
  const logoUrl = ensureAbsoluteUrl("/images/logo/logo.png", baseUrl);

  const adminPanelUrl = `${baseUrl}/admin/orders`;
  const subtotal = calcSubtotal(order.items);
  const shipping = Number(order.shippingAmount || 0);
  const discount = Number(order.discountAmount || 0);
  const total = Math.max(0, subtotal + shipping - discount);

  const placeholderImg = ensureAbsoluteUrl("/images/placeholder.jpg", baseUrl);

  const itemsHtml = order.items
    .map((it) => {
      const title = escapeHtml(it.product?.title || "Product");
      const color = it.color ? escapeHtml(it.color) : "";
      const qty = Math.max(1, Number(it.quantity || 1));
      const unit = Number(it.price || 0);
      const line = unit * qty;

      // ✅ Product image URL from GCS (fallback to placeholder)
      let imgUrl = placeholderImg;
      if (it.product?.images && it.product.images.length > 0) {
        imgUrl = getProductImageUrl(it.product.images[0]) || placeholderImg;
      } else if (it.product?.imageUrl) {
        imgUrl = getProductImageUrl(it.product.imageUrl) || placeholderImg;
      }

      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e6e6e6;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td width="64" valign="middle" style="padding-right:12px;">
                  <img src="${imgUrl}" width="64" height="64" alt="${title}"
                    style="display:block;border:0;outline:0;width:64px;height:64px;border-radius:12px;object-fit:cover;background:#f3f4f6;box-shadow:0 2px 4px rgba(0,0,0,0.10);" />
                </td>
                <td valign="middle" style="font-family:Poppins,Arial,Helvetica,sans-serif;">
                  <div style="font-weight:600;font-size:14px;color:#1A1A1A;line-height:1.4;">
                    ${title}
                  </div>
                  <div style="font-size:12px;color:#6b7280;margin-top:4px;">
                    ${color ? `Colour: ${color} • ` : ""}Qty: ${qty} • ${formatMoney(unit, currency)} each
                  </div>
                </td>
                <td align="right" valign="middle" style="font-family:Poppins,Arial,Helvetica,sans-serif;white-space:nowrap;">
                  <div style="font-size:14px;font-weight:700;color:#1A1A1A;">
                    ${formatMoney(line, currency)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>New Order</title>

  <link href="https://fonts.googleapis.com/css?family=Poppins:ital,wght@0,400;0,500;0,600" rel="stylesheet" />

  <!--[if mso]>
    <style>
      body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
      img { -ms-interpolation-mode: bicubic; }
    </style>
  <![endif]-->
</head>

<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    New order #${safeOrderNo} from ${escapeHtml(order.billingName)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          <!-- Top nav (match customer style) -->
          <tr>
            <td style="padding:20px 24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${logoUrl}" width="160" alt="Metro Opticals"
                      style="display:block;border:0;outline:0;width:160px;height:auto;max-width:100%;" />
                  </td>
                  <td align="right" valign="middle" style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:14px;">
                    <a href="${escapeHtml(
                      adminPanelUrl,
                    )}" target="_blank" style="color:#1A1A1A;text-decoration:none;">Open Admin Orders</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header / Hero box (match customer look) -->
          <tr>
            <td style="background:#F7F2E9;border-radius:12px;padding:36px 24px;text-align:center;">
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:28px;font-weight:600;color:#1A1A1A;letter-spacing:-0.03em;">
                New Order Received
              </div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#1A1A1A;margin-top:10px;">
                Order <b>#${safeOrderNo}</b> • ${escapeHtml(formatDate())}
              </div>

              <div style="margin-top:16px;">
                <!-- button (simple, email-safe) -->
                <a href="${escapeHtml(adminPanelUrl)}" target="_blank"
                  style="display:inline-block;background:#A17C4C;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-family:Poppins,Arial,Helvetica,sans-serif;font-weight:600;font-size:14px;">
                  Open Admin Orders
                </a>
              </div>

              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:12px;color:#53627a;margin-top:10px;">
                Reply-to is set to the customer email for quick replies.
              </div>
            </td>
          </tr>

          <!-- Status steps (same enhanced block for consistency) -->
          <tr>
            <td style="padding:36px 20px 10px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="width:33.33%;">
                    <div style="background:#10b981;width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:table;">
                      <span style="display:table-cell;vertical-align:middle;text-align:center;font-size:24px;color:#ffffff;">✓</span>
                    </div>
                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#10b981;font-weight:600;">Confirmed</div>
                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:11px;color:#6b7280;margin-top:4px;">Order Placed</div>
                  </td>
                  <td align="center" style="width:33.33%;">
                    <div style="background:#f3f4f6;width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:table;border:3px dashed #d1d5db;">
                      <span style="display:table-cell;vertical-align:middle;text-align:center;font-size:20px;">📦</span>
                    </div>
                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;font-weight:600;">Processing</div>
                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;margin-top:4px;">Preparing Items</div>
                  </td>
                  <td align="center" style="width:33.33%;">
                    <div style="background:#f3f4f6;width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:table;border:3px dashed #d1d5db;">
                      <span style="display:table-cell;vertical-align:middle;text-align:center;font-size:20px;">🚚</span>
                    </div>
                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;font-weight:600;">Delivered</div>
                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;margin-top:4px;">On The Way</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer + Order info (styled card like customer email sections) -->
          <tr>
            <td style="padding:18px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F7F2E9;border-radius:20px;padding:22px 18px;">
                <tr>
                  <td style="font-family:Poppins,Arial,Helvetica,sans-serif;color:#1A1A1A;">
                    <div style="font-size:18px;font-weight:600;letter-spacing:-0.03em;text-align:center;">
                      Customer Details
                    </div>

                    <div style="background:#ffffff;border-radius:12px;padding:14px;margin-top:14px;">
                      <div style="font-size:14px;line-height:1.7;">
                        <b>${escapeHtml(order.billingName)}</b><br/>
                        Email: <a href="mailto:${escapeHtml(
                          order.billingEmail,
                        )}" style="color:#A17C4C;font-weight:600;text-decoration:none;">${escapeHtml(
                          order.billingEmail,
                        )}</a><br/>
                        ${
                          order.billingPhone
                            ? `Phone: <a href="tel:${escapeHtml(
                                order.billingPhone,
                              )}" style="color:#A17C4C;font-weight:600;text-decoration:none;">${escapeHtml(
                                order.billingPhone,
                              )}</a><br/>`
                            : ""
                        }
                        Shipping: ${escapeHtml(order.shippingAddress)}
                      </div>

                      ${
                        order.notes
                          ? `<div style="margin-top:12px;background:#f8fafc;border-left:4px solid #A17C4C;border-radius:12px;padding:12px;">
                               <div style="font-weight:600;margin-bottom:6px;">Notes</div>
                               <div style="color:#53627a;line-height:1.6;">${escapeHtml(
                                 order.notes,
                               )}</div>
                             </div>`
                          : ""
                      }
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items card -->
          <tr>
            <td style="padding:14px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F7F2E9;border-radius:20px;padding:22px 18px;">
                <tr>
                  <td style="font-family:Poppins,Arial,Helvetica,sans-serif;color:#1A1A1A;">
                    <div style="font-size:18px;font-weight:600;letter-spacing:-0.03em;text-align:center;">
                      Items
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;margin-top:14px;">
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- Totals (match customer totals style) -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:12px;">
                      <tr>
                        <td style="background:#ffffff;border-radius:12px;padding:16px;">
                          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td style="font-size:16px;color:#1A1A1A;">Subtotal</td>
                              <td align="right" style="font-size:16px;color:#1A1A1A;font-weight:600;">
                                ${formatMoney(subtotal, currency)}
                              </td>
                            </tr>
                            ${
                              discount > 0
                                ? `
                            <tr>
                              <td style="font-size:16px;color:#1A1A1A;padding-top:12px;">Discount</td>
                              <td align="right" style="font-size:16px;color:#00af48;padding-top:12px;font-weight:600;">
                                -${formatMoney(discount, currency)}
                              </td>
                            </tr>
                            `
                                : ""
                            }

                            <tr>
                              <td style="font-size:16px;font-weight:700;color:#1A1A1A;padding-top:14px;">Total</td>
                              <td align="right" style="font-size:16px;font-weight:700;color:#1A1A1A;padding-top:14px;">
                                ${formatMoney(total, currency)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer (same contrast footer) -->
          <tr>
            <td style="padding:18px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#0F0F0F;border-radius:14px;padding:26px 22px;text-align:center;">
                    <img src="${logoUrl}" width="170" alt="Metro Opticals"
                      style="display:block;margin:0 auto 12px;border:0;width:170px;height:auto;max-width:100%;" />

                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#e5e7eb;line-height:1.7;">
                      <b style="color:#ffffff;">Metro Opticals</b> • Admin Notification
                    </div>

                    <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;margin-top:14px;">
                      © ${year} Metro Opticals. All rights reserved.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:16px;line-height:16px;font-size:1px;">&nbsp;</td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  orderId: number | string,
  orderDetails: OrderDetails,
) {
  if (!isResendConfigured()) throw new Error("Resend API key not configured");

  const baseUrl = getEmailBaseUrl();

  const emailFrom =
    process.env.EMAIL_FROM || "Metro Opticals <noreply@metroopticals.lk>";

  const html = renderCustomerOrderEmail({
    baseUrl,
    orderNumber,
    orderId,
    order: orderDetails,
  });

  return resend.emails.send({
    from: emailFrom,
    to: email,
    subject: `Order Confirmation - ${orderNumber} - Metro Opticals`,
    html,
  });
}

export async function sendOrderNotificationToAdmin(
  adminEmail: string,
  orderNumber: string,
  orderDetails: OrderDetails,
) {
  if (!isResendConfigured()) throw new Error("Resend API key not configured");

  const baseUrl = getEmailBaseUrl();

  const emailFrom =
    process.env.EMAIL_FROM || "Metro Opticals <noreply@metroopticals.lk>";

  const currency = process.env.EMAIL_CURRENCY || "USD";

  const html = renderAdminOrderEmail({
    baseUrl,
    orderNumber,
    order: orderDetails,
    currency,
  });

  return resend.emails.send({
    from: emailFrom,
    to: adminEmail,
    replyTo: orderDetails.billingEmail, // admin can reply directly to customer
    subject: `🛒 New Order #${orderNumber} - ${orderDetails.billingName}`,
    html,
  });
}

export async function sendContactFormEmail(
  adminEmail: string,
  contactData: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  },
) {
  if (!isResendConfigured()) throw new Error("Resend API key not configured");

  const baseUrl = getEmailBaseUrl();

  const emailFrom =
    process.env.EMAIL_FROM || "Metro Opticals <noreply@metroopticals.lk>";

  const safeSubject = escapeHtml(contactData.subject || "No Subject");
  const safeName = escapeHtml(contactData.name);
  const safeEmail = escapeHtml(contactData.email);
  const safePhone = escapeHtml(contactData.phone || "");
  const safeMessage = escapeHtml(contactData.message);

  // ✅ Match your other templates: public absolute logo URL
  const logoUrl = ensureAbsoluteUrl("/images/logo/logo.png", baseUrl);

  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>Contact Form Submission</title>

  <link href="https://fonts.googleapis.com/css?family=Poppins:ital,wght@0,400;0,500;0,600" rel="stylesheet" />

  <!--[if mso]>
    <style>
      body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
      img { -ms-interpolation-mode: bicubic; }
    </style>
  <![endif]-->
</head>

<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    New contact form submission from ${safeName}: ${safeSubject}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          <!-- Top nav (like order email) -->
          <tr>
            <td style="padding:20px 24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${logoUrl}" width="160" alt="Metro Opticals"
                      style="display:block;border:0;outline:0;width:160px;height:auto;max-width:100%;" />
                  </td>
                  <td align="right" valign="middle" style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:14px;">
                    <a href="mailto:${safeEmail}" style="color:#1A1A1A;text-decoration:none;">Reply</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero box (same style language as renderCustomerOrderEmail) -->
          <tr>
            <td style="background:#F7F2E9;border-radius:12px;padding:36px 24px;text-align:center;">
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:28px;font-weight:600;color:#1A1A1A;letter-spacing:-0.03em;">
                New Contact Message
              </div>
              <div style="font-family:Poppins,Arial,Helvetica,sans-serif;font-size:13px;color:#53627a;margin-top:10px;">
                Received on ${escapeHtml(formatDate())}
              </div>
            </td>
          </tr>

          <!-- Details card (matches items/summary card style) -->
          <tr>
            <td style="padding:14px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F7F2E9;border-radius:20px;padding:22px 18px;">
                <tr>
                  <td style="font-family:Poppins,Arial,Helvetica,sans-serif;color:#1A1A1A;">
                    <div style="font-size:18px;font-weight:600;letter-spacing:-0.03em;text-align:center;">
                      Contact Details
                    </div>

                    <div style="background:#ffffff;border-radius:12px;padding:14px;margin-top:14px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                            <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Name</div>
                            <div style="font-size:15px;font-weight:600;color:#1A1A1A;margin-top:4px;">${safeName}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                            <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Email</div>
                            <div style="font-size:15px;font-weight:600;color:#1A1A1A;margin-top:4px;">
                              <a href="mailto:${safeEmail}" style="color:#A17C4C;text-decoration:none;font-weight:600;">${safeEmail}</a>
                            </div>
                          </td>
                        </tr>

                        ${
                          safePhone
                            ? `
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                            <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Phone</div>
                            <div style="font-size:15px;font-weight:600;color:#1A1A1A;margin-top:4px;">
                              <a href="tel:${escapeHtml(
                                contactData.phone,
                              )}" style="color:#A17C4C;text-decoration:none;font-weight:600;">${safePhone}</a>
                            </div>
                          </td>
                        </tr>
                        `
                            : `
                        <tr>
                          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                            <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Phone</div>
                            <div style="font-size:14px;color:#6b7280;margin-top:4px;">N/A</div>
                          </td>
                        </tr>
                        `
                        }

                        <tr>
                          <td style="padding:14px 0;">
                            <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;text-transform:uppercase;">Message</div>
                            <div style="margin-top:10px;padding:14px;background:#f9fafb;border-left:4px solid #A17C4C;border-radius:12px;">
                              <div style="margin:0;color:#1A1A1A;font-size:14px;line-height:1.7;white-space:pre-wrap;">${safeMessage}</div>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Quick actions (email-safe buttons) -->
                    <div style="margin-top:14px;background:#ffffff;border-radius:12px;padding:14px;text-align:center;">
                      <a href="mailto:${safeEmail}?subject=${encodeURIComponent(
                        contactData.subject || "Re: Your message",
                      )}"
                        style="display:inline-block;background:#A17C4C;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-family:Poppins,Arial,Helvetica,sans-serif;font-weight:600;font-size:14px;">
                        Reply via Email
                      </a>

                      ${
                        contactData.phone
                          ? `
                        <span style="display:inline-block;width:10px;height:10px;"></span>
                        <a href="tel:${escapeHtml(contactData.phone)}"
                          style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-family:Poppins,Arial,Helvetica,sans-serif;font-weight:600;font-size:14px;">
                          Call Customer
                        </a>
                      `
                          : ""
                      }
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

                    <!-- Footer -->
          <tr>
            <td style="background:#1A1A1A;padding:30px;text-align:center;">
              <p style="margin:0 0 10px;font-size:16px;color:#ffffff;font-weight:500;">
                Metro Opticals
              </p>
              <p style="margin:0 0 15px;font-size:14px;color:#B5AEA2;">
                ${escapeHtml(siteConfig.tagline)}
              </p>
              <p style="margin:0;font-size:13px;color:#B5AEA2;">
                Email: <a href="mailto:${escapeHtml(BRAND.supportEmail)}" style="color:#B5AEA2;text-decoration:none;">${escapeHtml(BRAND.supportEmail)}</a>
                &nbsp;|&nbsp;
                Phone: <a href="tel:${escapeHtml(BRAND.supportPhone)}" style="color:#B5AEA2;text-decoration:none;">${escapeHtml(BRAND.supportPhoneLabel)}</a>
              </p>
              <p style="margin:15px 0 0;font-size:12px;color:#6b7280;">
                c ${year} Metro Opticals. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: emailFrom,
    to: adminEmail,
    replyTo: contactData.email, // admin can reply directly to customer
    subject: `Contact Form: ${safeSubject} - ${safeName}`,
    html,
  });
}
