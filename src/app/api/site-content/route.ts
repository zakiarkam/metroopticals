import { NextRequest } from "next/server";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { getAllSiteBlocks } from "@/features/site-content/services/site-content-service";

/**
 * Storefront content is public by definition  it is what every visitor is
 * already being served  so the list endpoint is open and the writes on
 * `[key]` are the ones behind an admin check.
 */
export async function GET(_request: NextRequest) {
  try {
    const blocks = await getAllSiteBlocks();
    return createSuccessResponse({ blocks });
  } catch (error) {
    return handleError(error);
  }
}
