import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth(requireAuth = false, requiredRole?: string) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (requireAuth && status === "unauthenticated") {
      router.push("/log-in");
      return;
    }

    if (session?.user && requiredRole && session.user.role !== requiredRole) {
      // Redirect based on actual role
      if (session.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [session, status, requireAuth, requiredRole, router]);

  return {
    user: session?.user,
    session,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  };
}
