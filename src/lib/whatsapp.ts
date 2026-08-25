import { siteConfig } from "@/config/site";

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAfter?: number;
  isRateLimited?: boolean;
  isInvalidNumber?: boolean;
}

export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Convert 00CC... -> +CC...
  let formatted = cleaned.startsWith("00") ? `+${cleaned.slice(2)}` : cleaned;

  // Sri Lanka local: 0XXXXXXXXX (10 digits)
  if (/^0\d{9}$/.test(formatted)) {
    formatted = `+94${formatted.slice(1)}`;
  }
  // Sri Lanka without plus: 94XXXXXXXXX (11 digits)
  else if (/^94\d{9}$/.test(formatted)) {
    formatted = `+${formatted}`;
  }
  // Other international without + (10–15 digits)
  else if (/^\d{10,15}$/.test(formatted) && !formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getRetryAfterSeconds(response: Response, body: any): number | null {
  const header = response.headers.get("retry-after");
  if (header && /^\d+$/.test(header)) return Number(header);
  if (body?.retry_after && Number.isFinite(Number(body.retry_after)))
    return Number(body.retry_after);
  return null;
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  options: { maxRetries?: number; retryDelayMs?: number } = {}
): Promise<WhatsAppResult> {
  const { maxRetries = 2, retryDelayMs = 61_000 } = options;

  if (!phoneNumber?.trim() || !message?.trim()) {
    return { success: false, error: "Missing phone number or message" };
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);

  // If API key not configured: return WhatsApp Web link (manual fallback)
  if (!process.env.WASENDER_API_KEY) {
    const whatsappUrl = `https://wa.me/${formattedPhone.replace(
      /^\+/,
      ""
    )}?text=${encodeURIComponent(message)}`;
    return { success: true, messageId: whatsappUrl };
  }

  const apiUrl =
    process.env.WASENDER_API_URL || "https://wasenderapi.com/api/send-message";

  // WaSender expects WhatsApp JID
  const toJid = formattedPhone.includes("@")
    ? formattedPhone
    : `${formattedPhone.replace(/^\+/, "")}@s.whatsapp.net`;

  let lastError: WhatsAppResult = { success: false, error: "Unknown error" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WASENDER_API_KEY}`,
        },
        body: JSON.stringify({ to: toJid, text: message }),
      });

      if (response.ok) {
        const result = (await response.json()) as any;
        return { success: true, messageId: result.messageId || result.id };
      }

      const raw = await response.text();
      let body: any = { message: raw };
      try {
        body = JSON.parse(raw);
      } catch {
        // keep text as message
      }

      // 422 - invalid JID / number not on WhatsApp
      if (response.status === 422) {
        return {
          success: false,
          error: `Number not registered on WhatsApp: ${formattedPhone}`,
          isInvalidNumber: true,
        };
      }

      // 429 - rate limited
      if (response.status === 429) {
        const retryAfterSec = getRetryAfterSeconds(response, body) ?? 60;

        lastError = {
          success: false,
          error: `Rate limited: ${body?.message || "Too many requests"}`,
          retryAfter: retryAfterSec,
          isRateLimited: true,
        };

        if (attempt < maxRetries) {
          const waitMs = Math.max(retryDelayMs, retryAfterSec * 1000);
          await sleep(waitMs);
          continue;
        }

        return lastError;
      }

      // Other API errors (no retry by default)
      return {
        success: false,
        error: `API request failed (${response.status}): ${
          body?.message || raw
        }`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      lastError = { success: false, error: msg };

      // network error retry
      if (attempt < maxRetries) {
        await sleep(5_000);
        continue;
      }
    }
  }

  return lastError;
}

const SUPPORT_CONTACT_PATH = "/contact";
const SUPPORT_PHONE = siteConfig.contact.phone;
const SUPPORT_EMAIL = siteConfig.contact.email;

const normalizeBaseUrl = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

export const getBaseUrl = () =>
  normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      siteConfig.domain ||
      (process.env.NODE_ENV !== "production" ? "http://localhost:4500" : "")
  );

const supportLine = () =>
  `Help: ${getBaseUrl()}${SUPPORT_CONTACT_PATH} | ${SUPPORT_PHONE} | ${SUPPORT_EMAIL}`;

const orderLink = (orderId: number | string) =>
  `${getBaseUrl()}/order-confirmation?orderId=${orderId}`;

const money = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

type OrderItemLine = {
  product: { title: string };
  quantity: number;
  price: number;
};

function formatItems(items: OrderItemLine[]) {
  const lines: string[] = [];
  items.forEach((item, i) => {
    const total = item.price * item.quantity;
    lines.push(`${i + 1}. ${item.product.title}`);
    lines.push(
      `   Qty: ${item.quantity} × ${money(item.price)} = ${money(total)}`
    );
  });
  return lines;
}

export function formatOrderPlacedCustomerWhatsAppMessage(params: {
  orderNumber: string;
  orderId: number | string;
  totalAmount: number;
  items: OrderItemLine[];
}) {
  const { orderNumber, orderId, totalAmount, items } = params;

  return [
    `*METRO OPTICALS*`,
    ``,
    `✅ *ORDER PLACED*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Thank you for your order! 🎉`,
    ``,
    `📋 *Order #:* ${orderNumber}`,
    `🔗 *Track:* ${orderLink(orderId)}`,
    `💰 *Total:* ${money(totalAmount)}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    supportLine(),
  ].join("\n");
}

export function formatOrderStatusWhatsAppMessage(params: {
  orderNumber: string;
  orderId: number | string;
  status: "SHIPPED" | "CANCELLED";
  totalAmount: number;
}) {
  const { orderNumber, orderId, status, totalAmount } = params;

  if (status === "SHIPPED") {
    return [
      `*METRO OPTICALS*`,
      ``,
      `🚚 *ORDER SHIPPED*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Your order is on the way! 📦`,
      ``,
      `📋 *Order #:* ${orderNumber}`,
      `🔗 *Track:* ${orderLink(orderId)}`,
      `💰 *Amount:* ${money(totalAmount)}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      supportLine(),
    ].join("\n");
  }

  return [
    `*METRO OPTICALS*`,
    ``,
    `❌ *ORDER CANCELLED*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Your order has been cancelled.`,
    ``,
    `📋 *Order #:* ${orderNumber}`,
    `🔗 *View:* ${orderLink(orderId)}`,
    `💰 *Amount:* ${money(totalAmount)}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    supportLine(),
  ].join("\n");
}
