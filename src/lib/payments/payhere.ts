import "server-only";

import crypto from "node:crypto";

import { AppError } from "@/lib/errors";

/**
 * PayHere, the Sri Lankan card gateway, in its redirect ("Checkout API")
 * form: the browser posts a signed form to PayHere, the customer pays there,
 * and PayHere posts the result back to `notify_url` server to server.
 *
 * The rule that shapes everything below: **the browser is never the source of
 * truth about money**. The customer's return to `return_url` is a navigation
 * anyone can type; only the signed server-to-server notification marks a bill
 * paid, and only after its signature, merchant id, currency and amount have
 * all been checked against the order we hold.
 *
 * MD5 here is not a security choice of ours - it is the signature algorithm
 * PayHere specifies, and both sides must agree. It is used only to
 * authenticate a message against a shared secret, and every comparison below
 * is constant-time so the digest cannot be guessed a byte at a time.
 */

export type PayHereMode = "sandbox" | "live";

const CHECKOUT_URL: Record<PayHereMode, string> = {
  sandbox: "https://sandbox.payhere.lk/pay/checkout",
  live: "https://www.payhere.lk/pay/checkout",
};

/** The site sells in rupees, so the gateway is only ever asked for rupees. */
export const PAYHERE_CURRENCY = "LKR";

/**
 * PayHere status codes, from its documentation. `PENDING` is real: an eZ Cash
 * or bank instruction can sit unsettled for a while, and the order must wait
 * rather than be cancelled or shipped.
 */
export const PAYHERE_STATUS = {
  SUCCESS: 2,
  PENDING: 0,
  CANCELED: -1,
  FAILED: -2,
  CHARGEDBACK: -3,
} as const;

export type PayHereConfig = {
  merchantId: string;
  merchantSecret: string;
  mode: PayHereMode;
  checkoutUrl: string;
};

/**
 * Sandbox unless told otherwise, in every environment. Getting this wrong in
 * the safe direction costs a failed test payment; getting it wrong the other
 * way charges a real card.
 */
export const payhereMode = (): PayHereMode =>
  process.env.NEXT_PUBLIC_PAYHERE_MODE?.trim().toLowerCase() === "live"
    ? "live"
    : "sandbox";

/** True only when the gateway is switched on *and* actually configured. */
export const isPayHereConfigured = () =>
  process.env.NEXT_PUBLIC_PAYHERE_ENABLED?.trim() === "true" &&
  Boolean(process.env.PAYHERE_MERCHANT_ID?.trim()) &&
  Boolean(process.env.PAYHERE_MERCHANT_SECRET?.trim());

/**
 * The gateway's credentials, or a 503 explaining that it is switched off.
 * Never returns half a configuration: a merchant id without its secret would
 * produce a form PayHere rejects, after the customer had already left the site.
 */
export const payhereConfig = (): PayHereConfig => {
  const merchantId = process.env.PAYHERE_MERCHANT_ID?.trim() ?? "";
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim() ?? "";

  if (!isPayHereConfigured()) {
    throw new AppError(
      "Online card payment is not available right now. Please choose another payment method.",
      503,
      "PAYHERE_UNAVAILABLE",
    );
  }

  const mode = payhereMode();
  return { merchantId, merchantSecret, mode, checkoutUrl: CHECKOUT_URL[mode] };
};

const md5Upper = (value: string) =>
  crypto.createHash("md5").update(value, "utf8").digest("hex").toUpperCase();

/**
 * `number_format($amount, 2, '.', '')` - PayHere signs the amount exactly as
 * it is sent, so a stray thousands separator or a third decimal makes a hash
 * that will not match and a payment that will not start.
 */
export const formatPayHereAmount = (amount: number) =>
  (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);

/**
 * How wide the `order_id` we send is, always.
 *
 * PayHere signs `merchant_id + order_id + amount + currency + ...` with no
 * separator between the fields, so a variable-length order id sitting next to
 * a variable-length amount makes the digest ambiguous: `512` + `3500.00` and
 * `5123` + `500.00` are the same string and therefore the same hash. Someone
 * holding a form we signed for their own order could re-split it, be charged
 * a fraction, and hand the gateway's genuine reply back to us as proof the
 * full amount was paid.
 *
 * Padding to a fixed width does not make the concatenation injective - the
 * digest cannot tell the two readings apart, and nothing on our side can -
 * but it does mean a re-split produces an order id of the wrong length. The
 * callback PayHere sends for the shifted charge then names no order we will
 * accept, so the attack only survives if the reply is intercepted and rewritten
 * on the way. That is what PayHere's domain restriction on `notify_url` exists
 * to stop, and why registering the domain is not optional - see README.
 */
const ORDER_ID_WIDTH = 12;
const ORDER_ID_PATTERN = new RegExp(`^\\d{${ORDER_ID_WIDTH}}$`);
/** `1234.00` - the exact shape `number_format($amount, 2, '.', '')` produces. */
const AMOUNT_PATTERN = /^\d+\.\d{2}$/;
/** `2`, `0`, `-1`, `-2`, `-3` - every code PayHere defines, and nothing else. */
const STATUS_PATTERN = /^-?\d$/;

export const formatPayHereOrderId = (orderId: number | string) =>
  String(orderId).padStart(ORDER_ID_WIDTH, "0");

/** Compares two hex digests without leaking where they first differ. */
const digestsMatch = (a: string, b: string) => {
  const left = Buffer.from(a.trim().toUpperCase(), "utf8");
  const right = Buffer.from(b.trim().toUpperCase(), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

/** `hash = MD5(merchant_id + order_id + amount + currency + MD5(secret))`. */
const checkoutHash = (params: {
  merchantId: string;
  merchantSecret: string;
  orderId: string;
  amount: string;
  currency: string;
}) =>
  md5Upper(
    params.merchantId +
      params.orderId +
      params.amount +
      params.currency +
      md5Upper(params.merchantSecret),
  );

/**
 * PayHere validates several of these fields and refuses the payment outright
 * if one is blank, so anything optional on our side gets a usable stand-in
 * rather than an empty string.
 */
const clamp = (
  value: string | null | undefined,
  max: number,
  fallback = "",
) => {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  return (trimmed || fallback).slice(0, max);
};

export type PayHereCustomer = {
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
};

export type PayHereDelivery = {
  address?: string | null;
  city?: string | null;
  country?: string | null;
};

export type PayHereCheckout = {
  /** Where the browser posts the form. */
  action: string;
  /** Hidden inputs, already signed. */
  fields: Record<string, string>;
  mode: PayHereMode;
};

/**
 * The signed form that starts a payment.
 *
 * `order_id` is our own order id: the notification names it, so the callback
 * can find the bill without trusting anything else in the message.
 */
export const buildPayHereCheckout = (params: {
  orderId: number | string;
  orderNumber: string;
  amount: number;
  itemsDescription: string;
  customer: PayHereCustomer;
  delivery?: PayHereDelivery;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}): PayHereCheckout => {
  const { merchantId, merchantSecret, mode, checkoutUrl } = payhereConfig();

  const orderId = formatPayHereOrderId(params.orderId);
  const amount = formatPayHereAmount(params.amount);

  // PayHere wants the name in two halves; our checkout collects one string.
  const nameParts = clamp(params.customer.name, 120, "Customer").split(" ");
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const fields: Record<string, string> = {
    merchant_id: merchantId,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    order_id: orderId,
    items: clamp(params.itemsDescription, 100, `Order ${params.orderNumber}`),
    currency: PAYHERE_CURRENCY,
    amount,
    first_name: clamp(firstName, 60, "Customer"),
    last_name: clamp(lastName, 60, "Customer"),
    email: clamp(params.customer.email, 120),
    phone: clamp(params.customer.phone, 30),
    address: clamp(params.customer.address, 200, "N/A"),
    city: clamp(params.customer.city, 60, "N/A"),
    country: clamp(params.customer.country, 60, "Sri Lanka"),
    // Echoed back in the notification and shown in PayHere's dashboard, so a
    // charge can be reconciled against a bill by eye. Not a security control
    // and never read as one: `custom_1` is outside the signature, so anyone
    // relaying a message can put whatever they like here.
    custom_1: clamp(params.orderNumber, 60),
    hash: checkoutHash({
      merchantId,
      merchantSecret,
      orderId,
      amount,
      currency: PAYHERE_CURRENCY,
    }),
  };

  const deliveryAddress = clamp(params.delivery?.address, 200);
  if (deliveryAddress) {
    fields.delivery_address = deliveryAddress;
    fields.delivery_city = clamp(params.delivery?.city, 60, "N/A");
    fields.delivery_country = clamp(params.delivery?.country, 60, "Sri Lanka");
  }

  return { action: checkoutUrl, fields, mode };
};

export type PayHereNotification = {
  merchantId: string;
  orderId: string;
  paymentId: string;
  amount: string;
  currency: string;
  statusCode: number;
  method: string | null;
  statusMessage: string | null;
  custom1: string | null;
};

/**
 * One shape rather than a tagged union: this project compiles with `strict`
 * off, where a `valid: true | false` discriminant does not narrow, and a
 * verification result that silently widens is the last thing that should be
 * read loosely.
 */
export type PayHereVerification = {
  /** The authenticated message, or null when it could not be trusted. */
  notification: PayHereNotification | null;
  /** Why it was rejected, for the audit line. Null when it was accepted. */
  reason: string | null;
};

/**
 * Authenticates a `notify_url` callback.
 *
 * `md5sig = MD5(merchant_id + order_id + payhere_amount + payhere_currency +
 * status_code + MD5(secret))`. Anyone can post to that endpoint; only someone
 * holding the merchant secret can produce this digest, which is what makes
 * the message trustworthy. The merchant id is checked too, so a signature
 * minted for a different PayHere account cannot settle a bill here.
 */
export const verifyPayHereNotification = (
  form: Record<string, string>,
): PayHereVerification => {
  const { merchantId, merchantSecret } = payhereConfig();

  const received = {
    merchantId: form.merchant_id ?? "",
    orderId: form.order_id ?? "",
    paymentId: form.payment_id ?? "",
    amount: form.payhere_amount ?? "",
    currency: form.payhere_currency ?? "",
    statusCode: form.status_code ?? "",
    md5sig: form.md5sig ?? "",
  };

  if (
    !received.merchantId ||
    !received.orderId ||
    !received.paymentId ||
    !received.amount ||
    !received.currency ||
    !received.statusCode ||
    !received.md5sig
  ) {
    return { notification: null, reason: "missing_fields" };
  }

  // Shape first, digest second. Because the signed fields are concatenated
  // without separators, a message whose order id or amount is not in exactly
  // the form we send is one whose field boundaries we cannot trust - see
  // ORDER_ID_WIDTH. Rejecting it here costs a genuine payment nothing: every
  // value below is echoed back exactly as we sent it.
  if (!ORDER_ID_PATTERN.test(received.orderId)) {
    return { notification: null, reason: "order_id_shape" };
  }
  if (!AMOUNT_PATTERN.test(received.amount)) {
    return { notification: null, reason: "amount_shape" };
  }
  if (!STATUS_PATTERN.test(received.statusCode)) {
    return { notification: null, reason: "status_code_shape" };
  }

  if (received.merchantId !== merchantId) {
    return { notification: null, reason: "merchant_mismatch" };
  }

  const expected = md5Upper(
    received.merchantId +
      received.orderId +
      received.amount +
      received.currency +
      received.statusCode +
      md5Upper(merchantSecret),
  );

  if (!digestsMatch(expected, received.md5sig)) {
    return { notification: null, reason: "signature_mismatch" };
  }

  const statusCode = Number.parseInt(received.statusCode, 10);

  return {
    reason: null,
    notification: {
      merchantId: received.merchantId,
      orderId: received.orderId,
      paymentId: received.paymentId,
      amount: received.amount,
      currency: received.currency,
      statusCode,
      method: form.method?.trim() || null,
      statusMessage: form.status_message?.trim() || null,
      custom1: form.custom_1?.trim() || null,
    },
  };
};

/** Absolute URL on this site, for the three callbacks PayHere needs. */
const siteUrl = (path: string) => {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) {
    throw new AppError(
      "NEXT_PUBLIC_SITE_URL is not set, so PayHere has nowhere to send the customer back to.",
      500,
      "SITE_URL_MISSING",
    );
  }
  return `${base}${path}`;
};

export const payhereReturnUrl = (orderId: number) =>
  siteUrl(`/order-confirmation?orderId=${orderId}&payment=return`);

export const payhereCancelUrl = (orderId: number) =>
  siteUrl(`/order-confirmation?orderId=${orderId}&payment=cancelled`);

/**
 * Where PayHere posts the result. Overridable because the callback has to be
 * reachable from the public internet: developing against the sandbox on a
 * laptop means pointing this at a tunnel, while the site itself still runs on
 * localhost.
 */
export const payhereNotifyUrl = () => {
  const override = process.env.PAYHERE_NOTIFY_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return siteUrl("/api/payments/payhere/notify");
};
