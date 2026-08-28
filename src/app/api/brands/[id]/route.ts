import { NextRequest } from "next/server";
import { updateBrandSchema } from "@/features/brands/validators/brand";
import {
  getBrandById,
  updateBrand,
  deleteBrand,
} from "@/features/brands/services/brand-service";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
import { parseIdParam } from "@/lib/utils/params";
import { logApiAction, logApiError } from "@/lib/audit";

const parseId = async (
  params?: Promise<Record<string, string | string[] | undefined>>
) => {
  const p = await params;
  const raw = Array.isArray(p?.id) ? p?.id[0] : p?.id;
  return parseIdParam(raw, "brand id");
};

type Ctx = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const id = await parseId(params);

    const brand = await getBrandById(id);
    return createSuccessResponse({ brand });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const start = Date.now();
  try {
    await requireAdmin();

    const id = await parseId(params);

    const body = await request.json();
    const data = updateBrandSchema.parse(body);
    const brand = await updateBrand(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "brand_update",
      resourceId: id,
    });

    return createSuccessResponse({ brand });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const start = Date.now();
  try {
    await requireAdmin();

    const id = await parseId(params);

    await deleteBrand(id);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "brand_delete",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Brand deleted" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
