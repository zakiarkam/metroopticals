import { NextRequest } from "next/server";
import { parseIdParam } from "@/lib/utils/params";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse, NotFoundError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";
import { prisma } from "@/lib/db/prisma";
import {
  deleteTryOnAsset,
  listTryOnAssets,
  upsertTryOnAsset,
} from "@/features/try-on/services/tryon-service";
import {
  deleteTryOnAssetSchema,
  upsertTryOnAssetSchema,
} from "@/features/try-on/validators/asset";

type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id]/tryon
// Public: the active assets of a product on sale. `?all=1` (admin only)
// returns every row, active or not, for the product editor.
export async function GET(request: NextRequest, { params }: Params) {
  const { id: rawId } = await params;

  try {
    const id = parseIdParam(rawId, "product id");
    const all = request.nextUrl.searchParams.get("all") === "1";

    if (all) {
      await requireAdmin();
    } else {
      const product = await prisma.product.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!product) throw new NotFoundError("Product not found");
      if (product.status !== "ACTIVE") {
        await requireAdmin().catch(() => {
          throw new NotFoundError("Product not found");
        });
      }
    }

    const assets = await listTryOnAssets(id, { activeOnly: !all });
    return createSuccessResponse({ assets });
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/products/[id]/tryon  create or update one colourway's asset.
export async function PUT(request: NextRequest, { params }: Params) {
  const { id: rawId } = await params;
  const start = Date.now();

  try {
    const id = parseIdParam(rawId, "product id");
    await requireAdmin();

    const body = await request.json();
    const data = upsertTryOnAssetSchema.parse(body);
    const asset = await upsertTryOnAsset(id, data);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_tryon_upsert",
      resourceId: id,
    });

    return createSuccessResponse({ asset });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}

// DELETE /api/products/[id]/tryon   Body: { colour }
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: rawId } = await params;
  const start = Date.now();

  try {
    const id = parseIdParam(rawId, "product id");
    await requireAdmin();

    const { colour } = deleteTryOnAssetSchema.parse(await request.json());
    await deleteTryOnAsset(id, colour);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_tryon_delete",
      resourceId: id,
    });

    return createSuccessResponse({ message: "Try-on asset removed" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
