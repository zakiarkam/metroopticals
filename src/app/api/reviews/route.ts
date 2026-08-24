import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { reviewQuerySchema } from "@/features/reviews/validators/review";
import { getReviews } from "@/features/reviews/services/review-service";

/** Moderation queue — admin only, since it exposes pending and rejected text. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const query = reviewQuerySchema.parse(Object.fromEntries(searchParams));

    return createSuccessResponse(await getReviews(query));
  } catch (error) {
    return handleError(error);
  }
}
