import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { deleteReview } from "@/features/reviews/services/review-service";
import { logApiAction, logApiError } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { id } = await params;
    await deleteReview(Number(id));

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "review_delete",
      resourceId: id,
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
