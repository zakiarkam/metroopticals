import "server-only";

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  auditLogger,
  getRequestMeta,
  logger,
  serializeError,
} from "@/lib/logger";

type AuditUser = {
  id?: number | string;
  email?: string | null;
  role?: string | null;
};

type ApiLogContext = {
  request: NextRequest;
  status?: number;
  durationMs?: number;
  resourceId?: string | number;
  action?: string;
};

const numericIdPattern = /^[0-9]+$/;

function inferResourceId(request: NextRequest) {
  const path = request.nextUrl?.pathname || "";
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last && numericIdPattern.test(last) ? last : undefined;
}

async function getAuditUser(): Promise<AuditUser | undefined> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as AuditUser | undefined;
    if (!user) return undefined;
    return {
      id: user.id,
      email: user.email ?? null,
      role: user.role ?? null,
    };
  } catch {
    return undefined;
  }
}

export async function logApiAction(context: ApiLogContext) {
  const meta = getRequestMeta(context.request);
  const user = await getAuditUser();
  const resourceId = context.resourceId ?? inferResourceId(context.request);
  const method = meta.method?.toLowerCase() || "request";
  const eventType = context.action ?? `http_${method}`;

  auditLogger.info("api_action", {
    event_type: eventType,
    userId: user?.id,
    email: user?.email,
    role: user?.role,
    status: context.status,
    durationMs: context.durationMs,
    resourceId,
    ...meta,
  });
}

export async function logApiError(
  error: unknown,
  context: ApiLogContext
) {
  const meta = getRequestMeta(context.request);
  const user = await getAuditUser();
  const resourceId = context.resourceId ?? inferResourceId(context.request);

  logger.error("API request failed", {
    event_type: "api_error",
    userId: user?.id,
    email: user?.email,
    role: user?.role,
    status: context.status,
    durationMs: context.durationMs,
    resourceId,
    ...meta,
    ...serializeError(error),
  });
}
