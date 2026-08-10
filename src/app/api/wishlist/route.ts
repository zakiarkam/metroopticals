import { NextRequest } from "next/server";
import { z } from "zod";
import {
  getWishlistItems,
  addToWishlist,
  clearWishlist,
} from "@/features/wishlist/services/wishlist-service";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

const addToWishlistSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const wishlistItems = await getWishlistItems(session.user.id);

    return createSuccessResponse({ wishlistItems });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = addToWishlistSchema.parse(body);

    const wishlistItem = await addToWishlist(session.user.id, data.productId);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "wishlist_add",
      resourceId: data.productId,
    });

    return createSuccessResponse({ wishlistItem }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    await clearWishlist(session.user.id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "wishlist_clear",
      resourceId: session.user.id,
    });

    return createSuccessResponse({ message: "Wishlist cleared successfully" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
