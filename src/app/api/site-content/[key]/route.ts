import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import {
  getSiteBlock,
  resetSiteBlock,
  saveSiteBlock,
} from "@/features/site-content/services/site-content-service";
import { getBlockDefinition } from "@/features/site-content/constants/blocks";
import { logApiAction, logApiError } from "@/lib/audit";

type Params = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    if (!getBlockDefinition(key)) {
      return createSuccessResponse({ block: null }, 404);
    }
    return createSuccessResponse({ block: await getSiteBlock(key) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { key } = await params;
    const body = await request.json();

    // The block registry is the schema — anything not declared is dropped, so
    // a stale or hand-crafted payload cannot write arbitrary keys into the row.
    const definition = getBlockDefinition(key);
    if (!definition) {
      return createSuccessResponse({ error: "Unknown block" }, 404);
    }

    const allowed = new Set(definition.fields.map((field) => field.name));
    const data = Object.fromEntries(
      Object.entries(body?.data ?? {}).filter(([name]) => allowed.has(name))
    );

    const block = await saveSiteBlock(key, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "site_content_update",
      resourceId: key,
    });

    return createSuccessResponse({ block });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { key } = await params;
    const block = await resetSiteBlock(key);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "site_content_reset",
      resourceId: key,
    });

    return createSuccessResponse({ block });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
