import { NextRequest } from "next/server";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth";
import { getAllSiteBlocks } from "@/features/site-content/services/site-content-service";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    const blocks = await getAllSiteBlocks();
    return createSuccessResponse({ blocks });
  } catch (error) {
    return handleError(error);
  }
}
