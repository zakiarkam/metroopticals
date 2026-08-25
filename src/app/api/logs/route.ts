import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, getRequestMeta } from "@/lib/logger";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_CONTEXT_BYTES = 4 * 1024;

const payloadSchema = z.object({
  level: z.enum(["info", "warn", "error"]),
  message: z.string().min(1).max(1024),
  event_type: z.string().max(128).optional(),
  requestId: z.string().max(128).optional(),
  context: z
    .record(z.string(), z.any())
    .optional()
    .refine(
      (ctx) => !ctx || JSON.stringify(ctx).length <= MAX_CONTEXT_BYTES,
      { message: "context too large" }
    ),
});

export async function POST(request: NextRequest) {
  try {
    rateLimit(`logs:${getClientIp(request)}`, 60, 60 * 1000);

    const payload = payloadSchema.parse(await request.json());
    const meta = getRequestMeta(request);

    const entry = {
      source: "client",
      event_type: payload.event_type,
      requestId: payload.requestId,
      ...meta,
      ...(payload.context ? { context: payload.context } : {}),
    };

    if (payload.level === "error") {
      logger.error(payload.message, entry);
    } else if (payload.level === "warn") {
      logger.warn(payload.message, entry);
    } else {
      logger.info(payload.message, entry);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid log payload" },
      { status: 400 }
    );
  }
}
