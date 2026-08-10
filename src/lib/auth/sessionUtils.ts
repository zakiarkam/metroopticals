import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Unauthorized: No valid session");
  }

  return session;
}

export function isAuthenticated(session: any): boolean {
  return !!session?.user;
}
