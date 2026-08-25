import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !Number.isInteger(session.user.id)) {
    throw new UnauthorizedError("Authentication required");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Admin access required");
  }

  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();

  if (session.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Super admin access required");
  }

  return session;
}
