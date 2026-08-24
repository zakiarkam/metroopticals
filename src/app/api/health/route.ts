import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger, serializeError } from "@/lib/logger";

/**
 * Health check endpoint. Railway polls this after each deploy and will not
 * switch traffic to a new container until it returns 200.
 *
 * GET /api/health
 */
// Never let a cached 200 stand in for a real check.
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          api: "operational",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Health check failed", serializeError(error));

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "disconnected",
          api: "operational",
        },
        /*
         * Deliberately generic. This endpoint is unauthenticated, and the
         * driver's message can name the host, database and user. The real
         * error goes to the logs above, where Railway can show it.
         */
        error: "Database connectivity check failed",
      },
      { status: 503 }
    );
  }
}
