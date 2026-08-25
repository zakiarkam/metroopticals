import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger, getRequestMeta } from "@/lib/logger";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_MESSAGE_CHARS = 1024;
const MAX_CONTEXT_CHARS = 8 * 1024;

// Oversized entries are truncated rather than rejected: a client error report
// that is dropped for being too long is exactly the one you wanted to see.
const payloadSchema = z.object({
  level: z.enum(["info", "warn", "error"]),
  message: z
    .string()
    .min(1)
    .transform((m) => m.slice(0, MAX_MESSAGE_CHARS)),
  event_type: z.string().max(128).optional(),
  requestId: z.string().max(128).optional(),
  context: z
    .record(z.string(), z.any())
    .optional()
    .transform((ctx) => {
      if (!ctx) return ctx;
      const raw = JSON.stringify(ctx);
      return raw.length <= MAX_CONTEXT_CHARS
        ? ctx
        : { truncated: true, preview: raw.slice(0, MAX_CONTEXT_CHARS) };
    }),
});

export async function POST(request: NextRequest) {
  try {
    rateLimit(`logs:${getClientIp(request)}`, 120, 60 * 1000);

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
