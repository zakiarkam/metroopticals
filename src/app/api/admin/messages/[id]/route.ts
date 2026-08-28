import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError, NotFoundError } from "@/lib/errors";
import { logApiAction, logApiError } from "@/lib/audit";
import { parseIdParam } from "@/lib/utils/params";

const statusSchema = z.object({ status: z.enum(["unread", "read", "archived"]) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  try {
    await requireAdmin();
    const { id: raw } = await params;
    const id = parseIdParam(raw, "message id");
    const { status } = statusSchema.parse(await request.json());

    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Message not found");

    const message = await prisma.contactMessage.update({ where: { id }, data: { status } });

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "contact_message_status",
      resourceId: id,
    });

    return createSuccessResponse({ message });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
