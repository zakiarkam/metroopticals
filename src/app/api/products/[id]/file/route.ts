import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError, createSuccessResponse } from "@/lib/errors";
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
  const resolvedParams = params ? await params : undefined;
  const idParam = resolvedParams?.id;
  const rawId = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = rawId ? Number(rawId) : NaN;
  if (!rawId || Number.isNaN(id)) {
    return handleError({ message: "Product id is required" });
  }
  try {
    await requireAdmin();
    const { type, fileName } = await request.json();
    if (!type || !fileName) {
      return handleError({ message: "type and fileName are required" });
    }

    // Fetch product
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return handleError({ message: "Product not found" });
    }

    if (type === "image") {
      // Remove image from DB
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
      // Remove catalogue from DB
      await prisma.product.update({
        where: { id },
        data: { catalogueFile: null },
      });
      // Remove from bucket
      await deleteFile("product/catalogue", fileName);
    } else {
      return handleError({
        message: "Invalid type. Must be 'image' or 'catalogue'",
      });
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
