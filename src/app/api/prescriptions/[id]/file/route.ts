import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { downloadFile } from "@/lib/storage/r2";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError, NotFoundError, ValidationError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * The uploaded prescription slip itself.
 *
 * This is the ONLY way the file is reachable. It is stored under a random,
 * unguessable key and its public URL is never built anywhere — so access is
 * whatever this route decides it is:
 *
 *   - the customer it belongs to, and
 *   - any admin, because the shop has to check the powers against the
 *     document before it cuts a pair of lenses.
 *
 * Every admin view is written to the audit log. Reading somebody's medical
 * document is a thing a shop should be able to account for afterwards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    const session = await requireAuth();

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Invalid prescription id");
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      select: { id: true, userId: true, imageFile: true, label: true },
    });

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const isOwner = prescription?.userId === session.user.id;

    // Someone else's prescription is reported missing rather than forbidden:
    // whose it is, is itself the thing not to leak.
    if (!prescription || (!isOwner && !isAdmin)) {
      throw new NotFoundError("Prescription not found");
    }

    if (!prescription.imageFile) {
      throw new NotFoundError("No prescription image was uploaded");
    }

    const file = await downloadFile(
      "prescription/private",
      prescription.imageFile,
    );

    // The row points at an object that is no longer there. A clear 404 beats
    // a 500 for something the shop can do nothing about.
    if (!file) throw new NotFoundError("The prescription image is no longer stored");

    if (isAdmin && !isOwner) {
      await logApiAction({
        request,
        status: 200,
        durationMs: Date.now() - start,
        action: "prescription_image_view",
        resourceId: id,
      });
    }

    const isPdf = file.contentType === "application/pdf";

    return new NextResponse(Buffer.from(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        // A PDF is offered as a download rather than rendered in our own
        // origin, the same rule the product catalogues follow.
        "Content-Disposition": isPdf
          ? `attachment; filename="prescription-${id}.pdf"`
          : "inline",
        // Never cached by anything shared, and not written to disk by the
        // browser either. This is somebody's medical record.
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
