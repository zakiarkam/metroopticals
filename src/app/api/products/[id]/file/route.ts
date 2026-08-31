import { parseIdParam } from "@/lib/utils/params";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { deleteFile } from "@/lib/storage/r2";
import { logApiAction, logApiError } from "@/lib/audit";

// DELETE /api/products/[id]/file
// Body: { type: 'image' | 'catalogue', fileName: string }
export async function DELETE(
  request: NextRequest,
  { params }: { params?: Promise<Record<string, string | string[] | undefined>> }
) {
  const start = Date.now();
  try {
    await requireAdmin();

    // Inside the try so a mistyped id is a clean 400, not an unhandled 500.
    const resolvedParams = params ? await params : undefined;
    const idParam = resolvedParams?.id;
    const rawId = Array.isArray(idParam) ? idParam[0] : idParam;
    const id = parseIdParam(rawId, "product id");

    const { type, fileName } = await request.json();
    if (!type || typeof fileName !== "string" || !fileName) {
      return handleError(new ValidationError("type and fileName are required"));
    }

    // Fetch product
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return handleError(new ValidationError("Product not found"));
    }

    // The name must be one of THIS product's files. Without the check, any
    // admin could delete any object in the bucket by naming it here.
    if (type === "image") {
      if (!(product.images || []).includes(fileName)) {
        return handleError(
          new ValidationError("That file is not one of this product's images"),
        );
      }
      const newImages = (product.images || []).filter(
        (img: string) => img !== fileName
      );
      await prisma.product.update({
        where: { id },
        data: { images: newImages },
      });
      // Remove from bucket
      await deleteFile("product/image", fileName);
    } else if (type === "catalogue") {
      if (product.catalogueFile !== fileName) {
        return handleError(
          new ValidationError("That file is not this product's catalogue"),
        );
      }
      await prisma.product.update({
        where: { id },
        data: { catalogueFile: null },
      });
      // Remove from bucket
      await deleteFile("product/catalogue", fileName);
    } else {
      return handleError(new ValidationError("Invalid type. Must be 'image' or 'catalogue'"));
    }

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "product_file_delete",
      resourceId: id,
    });

    return createSuccessResponse({ message: "File deleted successfully" });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
