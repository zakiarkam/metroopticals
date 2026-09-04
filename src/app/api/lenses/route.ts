import { NextRequest } from "next/server";

import { getLensCatalogue } from "@/features/lenses/services/lens-service";
import { isOcrAvailable } from "@/lib/prescription-ocr";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";

/**
 * The lens menu, plus whether "Upload a photo" is worth offering - a reader
 * that is not configured must not be shown as a dead option.
 */
export async function GET(request: NextRequest) {
  try {
    const includeInactive =
      request.nextUrl.searchParams.get("includeInactive") === "true";

    if (includeInactive) await requireAdmin();

    const lensTypes = await getLensCatalogue({ includeInactive });

    return createSuccessResponse({
      lensTypes,
      uploadEnabled: isOcrAvailable(),
    });
  } catch (error) {
    return handleError(error);
  }
}
