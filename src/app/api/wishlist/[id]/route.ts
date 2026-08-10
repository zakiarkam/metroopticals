import { NextRequest } from "next/server";
import { removeFromWishlist } from "@/features/wishlist/services/wishlist-service";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = Number(rawId);
    await removeFromWishlist(session.user.id, id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "wishlist_remove",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Item removed from wishlist" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
