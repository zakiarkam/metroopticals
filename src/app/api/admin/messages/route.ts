import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/auth";
import { createSuccessResponse, handleError } from "@/lib/errors";
import { logApiError } from "@/lib/audit";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["unread", "read", "archived", "all"]).default("all"),
  search: z.string().trim().max(120).optional(),
});

/**
 * Enquiries from the contact form. They were being saved and emailed, but
 * nothing in the admin showed them  so a mail server hiccup meant a customer
 * who wrote in was simply never answered.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const search = query.search?.trim();

    const where = {
      ...(query.status === "all" ? {} : { status: query.status }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { subject: { contains: search, mode: "insensitive" as const } },
              { message: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [messages, total, unread] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { status: "unread" } }),
    ]);

    return createSuccessResponse({
      messages,
      unread,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
