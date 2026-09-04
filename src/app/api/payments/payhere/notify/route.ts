import { NextRequest, NextResponse } from "next/server";

import { applyPayHereNotification } from "@/features/checkout/services/payhere-service";
import {
  verifyPayHereNotification,
  type PayHereNotification,
} from "@/lib/payments/payhere";
import { AppError } from "@/lib/errors";
import { auditLogger, logger, serializeError } from "@/lib/logger";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * PayHere's server-to-server result callback - the only thing on this site
 * that may mark an online order paid.
 *
 * It is unauthenticated by nature: anyone on the internet can post here. What
 * makes a message trustworthy is the signature over the merchant secret,
 * checked before a single field is believed, followed by a check that the
 * amount and currency match the order we hold. The customer's own return to
 * the site proves nothing and settles nothing.
 *
 * Status codes are deliberate: 200 means "handled, stop retrying", and
 * anything else asks PayHere to deliver it again later. A forged or
 * mismatched message gets 400 and is recorded, never quietly swallowed.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    // Loose enough for PayHere's own retries and for several customers paying
    // at once; tight enough that the endpoint cannot be used to hammer the
    // database with signature checks.
    rateLimit(`payhere:notify:${ip}`, 120, 60 * 1000);
  } catch {
    return new NextResponse("Too many requests", { status: 429 });
  }

  let form: Record<string, string>;
  try {
    // PayHere posts `application/x-www-form-urlencoded`, never JSON.
    const body = await request.formData();
    form = {};
    for (const [key, value] of body.entries()) {
      if (typeof value === "string") form[key] = value;
    }
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Verification needs the merchant secret, so it throws when the gateway is
  // switched off. A callback arriving then is either a leftover from a live
  // payment or someone probing: neither is a server fault, and neither should
  // be retried at us.
  let notification: PayHereNotification | null = null;
  let reason: string | null = "not_configured";
  try {
    ({ notification, reason } = verifyPayHereNotification(form));
  } catch (error) {
    logger.warn("PayHere notification could not be verified", {
      orderId: form.order_id,
      ip,
      cause: serializeError(error),
    });
  }

  if (!notification) {
    // Worth an audit line every time: a run of these is either a
    // misconfigured secret or someone probing for a way to mark bills paid.
    auditLogger.warn("payhere_notify_rejected", {
      event_type: "payhere_notify_rejected",
      reason,
      orderId: form.order_id,
      ip,
    });
    return new NextResponse("Invalid notification", { status: 400 });
  }

  try {
    const { outcome } = await applyPayHereNotification(notification);

    auditLogger.info("payhere_notify", {
      event_type: "payhere_notify",
      outcome,
      orderId: notification.orderId,
      paymentId: notification.paymentId,
      statusCode: notification.statusCode,
      method: notification.method,
      amount: notification.amount,
      ip,
    });

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    // A signed message about an order that does not exist, or for the wrong
    // money, will not become valid on a retry. Record it and accept it, so
    // the gateway stops resending something we will never act on.
    if (error instanceof AppError && error.statusCode < 500) {
      auditLogger.error("payhere_notify_unprocessable", {
        event_type: "payhere_notify_unprocessable",
        message: error.message,
        orderId: notification.orderId,
        paymentId: notification.paymentId,
        ip,
      });
      return new NextResponse("Not processed", { status: 200 });
    }

    // Something on our side broke - the database, the mailer, a bug. Ask for
    // the message again rather than losing a payment we have been told about.
    logger.error("PayHere notification handling failed", serializeError(error));
    return new NextResponse("Retry later", { status: 500 });
  }
}
