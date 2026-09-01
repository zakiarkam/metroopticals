import { NextRequest } from "next/server";

import { startPayHerePayment } from "@/features/checkout/services/payhere-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

/**
 * Signs one attempt at paying an order through PayHere.
 *
 * The response holds only what the browser has to post on: the gateway URL
 * and the public form fields. The merchant secret is used to make the hash
 * and never leaves the server, which is the whole reason this is an endpoint
 * rather than something the checkout builds for itself.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    // Starting a payment is cheap for us and expensive for anyone trying to
    // mine signed forms, so the ceiling is per customer and generous enough
    // for the retries a real person makes after a declined card.
    rateLimit(`payhere:session:${session.user.id}`, 12, 10 * 60 * 1000);

    const { orderId } = bodySchema.parse(await request.json());
    const checkout = await startPayHerePayment(orderId, session.user.id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "payhere_session_create",
      resourceId: orderId,
    });

    return createSuccessResponse(checkout);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
