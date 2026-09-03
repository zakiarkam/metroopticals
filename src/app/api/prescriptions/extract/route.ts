import { NextRequest } from "next/server";

import { extractFromUpload } from "@/features/prescriptions/services/extraction-service";
import { requireAuth } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, ValidationError } from "@/lib/errors";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * Read a prescription off an uploaded photo or PDF.
 *
 * Rate limited hard, and for two different reasons: the reader is billed per
 * call, and this is the one endpoint on the site that will happily accept
 * eight megabytes from anyone signed in. The file is never stored — only the
 * numbers the customer goes on to confirm are.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const session = await requireAuth();

    // Ten reads an hour is far more than a person needs and far less than a
    // script could spend. The cache means re-reading the same slip is free
    // and does not count.
    rateLimit(`rx-extract:${session.user.id}`, 10, 60 * 60 * 1000);
    rateLimit(`rx-extract-ip:${getClientIp(request)}`, 20, 60 * 60 * 1000);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Choose a photo of your prescription");
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const result = await extractFromUpload({
      bytes,
      fileName: file.name || "prescription",
      declaredType: file.type || "",
    });

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: result.cached ? "prescription_extract_cached" : "prescription_extract",
      // The hash, never the values: the audit log records that a read
      // happened, not what somebody's eyes are.
      resourceId: result.fileHash.slice(0, 16),
    });

    return createSuccessResponse({ extraction: result });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
