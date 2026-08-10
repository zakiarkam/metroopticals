import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isAdminRoute =
    path.startsWith("/admin") && !path.startsWith("/admin/api");
  const isAuthAdminRoute = path === "/log-in"; // tighter match
  const isCustomerProtectedRoute =
    path.startsWith("/profile") ||
    path.startsWith("/orders") ||
    path.startsWith("/checkout") ||
    path.startsWith("/my-account");

  // ✅ Robust token detection for both secure + non-secure cookie names
  const token =
    (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: true,
    })) ||
    (await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: false,
    }));

  // Handle admin routes
  if (isAdminRoute) {
    if (!token) {
      const url = new URL("/log-in", request.url);
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    const role = (token as any).role;

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (path === "/admin" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin/users", request.url));
    }

    return NextResponse.next();
  }

  // Handle log-in page - redirect authenticated users
  if (isAuthAdminRoute && token) {
    const role = (token as any).role;

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const redirectUrl =
        redirectParam || (role === "SUPER_ADMIN" ? "/admin" : "/admin/users");

      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  // Handle customer protected routes
  if (isCustomerProtectedRoute && !token) {
    const url = new URL("/log-in", request.url);
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/log-in",
    "/profile/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/my-account/:path*",
  ],
};
