import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { createReviewSchema } from "@/features/reviews/validators/review";
import {
  deleteOwnReview,
  getProductReviews,
  upsertReview,
} from "@/features/reviews/services/review-service";
import { logApiAction, logApiError } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const productId = Number(id);
    if (!Number.isFinite(productId)) {
      return createSuccessResponse({ error: "Invalid product" }, 400);
    }

    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    const viewerId = session?.user ? Number((session.user as any).id) : null;

    const result = await getProductReviews(
      productId,
      {
        page: Math.max(1, Number(searchParams.get("page")) || 1),
        limit: Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10)),
      },
      Number.isFinite(viewerId) ? viewerId : null
    );

    return createSuccessResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

/** Create or replace the signed-in customer's review of this product. */
export async function POST(request: NextRequest, { params }: Params) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const userId = Number((session.user as any).id);
    rateLimit(`review:${userId}`, 10, 60 * 60 * 1000);

    const { id } = await params;
    const productId = Number(id);
    if (!Number.isFinite(productId)) {
      return createSuccessResponse({ error: "Invalid product" }, 400);
    }

    const body = await request.json();
    const data = createReviewSchema.parse(body);

    const review = await upsertReview(userId, productId, data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "review_submit",
      resourceId: review.id,
    });

    return createSuccessResponse({ review }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

/** Withdraw the signed-in customer's own review. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const userId = Number((session.user as any).id);

    const { id } = await params;
    const productId = Number(id);

    await deleteOwnReview(userId, productId);

    return createSuccessResponse({ success: true });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
