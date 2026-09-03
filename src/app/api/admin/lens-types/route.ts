import { NextRequest } from "next/server";

import { createLensTypeSchema } from "@/features/lenses/validators/lens";
import {
  createLensType,
  getLensCatalogue,
  syncLensTypesFromGuide,
} from "@/features/lenses/services/lens-service";
import { requireSuperAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * The lens price list.
 *
 * Super admin only: this is what the shop charges, and a counter admin who
 * can edit it can discount the whole catalogue without leaving a bill behind.
 */
export async function GET() {
  try {
    await requireSuperAdmin();

    // The guide is the source of what the shop sells; this table is only what
    // it charges. Syncing here means a lens type or a colourway added to the
    // guide is sitting on this screen waiting to be priced, rather than
    // needing someone to remember a separate import step. It is additive and
    // idempotent, so doing it on every load costs one query and changes
    // nothing once everything is in place.
    const added = await syncLensTypesFromGuide();

    const lensTypes = await getLensCatalogue({ includeInactive: true });
    return createSuccessResponse({ lensTypes, added });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const data = createLensTypeSchema.parse(body);
    const lensType = await createLensType(data);

    await logApiAction({
      request,
      status: 201,
      durationMs: Date.now() - start,
      action: "lens_type_create",
      resourceId: lensType.id,
    });

    return createSuccessResponse({ lensType }, 201);
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
