import { NextRequest } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse, ValidationError } from "@/lib/errors";
import {
  getSiteBlock,
  resetSiteBlock,
  saveSiteBlock,
} from "@/features/site-content/services/site-content-service";
import { getBlockDefinition } from "@/features/site-content/constants/blocks";
import { logApiAction, logApiError } from "@/lib/audit";

type Params = { params: Promise<{ key: string }> };

// Blocks that must never be read anonymously. Business details carry the
// bank account a customer pays into, so a signed-in customer may read them
// (their invoice needs them); a stranger crawling the API may not.
const PRIVATE_BLOCKS = new Set(["business.details"]);

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { key } = await params;
    if (!getBlockDefinition(key)) {
      return createSuccessResponse({ block: null }, 404);
    }
    if (PRIVATE_BLOCKS.has(key)) {
      await requireAuth();
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

    // The block registry is the schema  anything not declared is dropped, so
    // a stale or hand-crafted payload cannot write arbitrary keys into the row.
    const definition = getBlockDefinition(key);
    if (!definition) {
      return createSuccessResponse({ error: "Unknown block" }, 404);
    }

    const allowed = new Set(definition.fields.map((field) => field.name));
    const data = Object.fromEntries(
      Object.entries(body?.data ?? {}).filter(([name]) => allowed.has(name)),
    );

    // Every link an admin types is rendered straight into an href on the
    // storefront. Only a web address or a path on this site is allowed 
    // `javascript:` and friends are refused here rather than trusted to the
    // browser.
    const isSafeHref = (value: unknown) =>
      typeof value !== "string" ||
      value.trim() === "" ||
      /^https?:\/\//i.test(value.trim()) ||
      (value.trim().startsWith("/") && !value.trim().startsWith("//"));
    const checkLinks = (value: unknown, path: string): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => checkLinks(item, `${path}[${index}]`));
        return;
      }
      if (value && typeof value === "object") {
        for (const [name, inner] of Object.entries(value as Record<string, unknown>)) {
          if (/href|link|url/i.test(name) && !isSafeHref(inner)) {
            throw new ValidationError(
              `${path ? `${path}.` : ""}${name} must start with https://, http:// or /`,
            );
          }
          checkLinks(inner, path ? `${path}.${name}` : name);
        }
      }
    };
    checkLinks(data, "");

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
