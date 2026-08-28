import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { updateReviewStatusSchema } from "@/features/reviews/validators/review";
import { setReviewStatus } from "@/features/reviews/services/review-service";
import { logApiAction, logApiError } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { status } = updateReviewStatusSchema.parse(body);

    const review = await setReviewStatus(parseIdParam(id, "review id"), status);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "review_moderate",
      resourceId: review.id,
    });

    return createSuccessResponse({ review });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
