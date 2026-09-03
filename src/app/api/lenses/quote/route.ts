import { NextRequest } from "next/server";

import {
  lensQuoteBatchSchema,
  lensQuoteSchema,
} from "@/features/lenses/validators/lens";
import {
  quoteLensType,
  quoteLensTypes,
} from "@/features/lenses/services/lens-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Price a prescription against one lens type, or against a whole list of them.
 *
 * This is our own price list and nothing else — no outside call, no cost per
 * request — which is what lets the picker re-quote instantly every time the
 * shopper changes their mind about the lens.
 *
 * Signed-in only, because a prescription is being posted: powers belong to a
 * person, and quoting is not a thing to offer anonymously.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Generous — the picker is meant to be poked at — but not unlimited.
    rateLimit(`lens-quote:${session.user.id}:${getClientIp(request)}`, 120, 60_000);

    const body = await request.json();

    if (Array.isArray(body?.lensTypeIds)) {
      const data = lensQuoteBatchSchema.parse(body);
      const quotes = await quoteLensTypes(session.user.id, data);
      return createSuccessResponse({ quotes });
    }

    const data = lensQuoteSchema.parse(body);
    const quote = await quoteLensType(session.user.id, data);
    return createSuccessResponse({ quote });
  } catch (error) {
    return handleError(error);
  }
}
