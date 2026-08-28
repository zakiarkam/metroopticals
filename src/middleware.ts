import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * The content security policy, minted per request.
 *
 * Every inline script Next emits is stamped with this request's nonce, so the
 * browser runs the app's own scripts and nothing that was smuggled into the
 * page  the backstop for anything that ever slips past the admin-content
 * validation. Styles stay inline-allowed: Tailwind and the editors set them
 * that way. `'strict-dynamic'` lets nonce'd scripts load the chunks they
 * need without every hash being listed here.
 */
const buildCsp = (nonce: string) => {
  const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    // Next needs 'unsafe-eval' only for its dev-mode React refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: https:${r2 ? ` ${r2}` : ""}`,
    "connect-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
};

const withCsp = (request: NextRequest, response: NextResponse, nonce: string) => {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // A fresh nonce for this response, passed to Next through the request so
  // its inline scripts carry it.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", buildCsp(nonce));
  const next = () =>
    withCsp(request, NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  const redirect = (url: URL) => withCsp(request, NextResponse.redirect(url), nonce);

  const isAdminRoute = path.startsWith("/admin");
  const isAuthAdminRoute = path === "/log-in";
  const isCustomerProtectedRoute =
    path.startsWith("/checkout") || path.startsWith("/my-account");

  // Public pages need only the policy header; no session lookup.
  if (!isAdminRoute && !isAuthAdminRoute && !isCustomerProtectedRoute) {
    return next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    // The cookie name follows the scheme the app is actually served on;
    // probing both lets a session cookie be read under the wrong prefix.
    secureCookie: (process.env.NEXTAUTH_URL ?? "").startsWith("https://"),
  });

  // Handle admin routess
  if (isAdminRoute) {
    if (!token) {
      const url = new URL("/log-in", request.url);
      url.searchParams.set("redirect", path);
      return redirect(url);
    }

    const role = (token as any).role;

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return redirect(new URL("/", request.url));
    }

    // The dashboard is owner-only, so an admin who lands on /admin is sent to
    // the till  the screen a person on the shop floor actually opens.
    if (path === "/admin" && role !== "SUPER_ADMIN") {
      return redirect(new URL("/admin/pos", request.url));
    }

    return next();
  }

  // Handle log-in page - redirect authenticated users
  if (isAuthAdminRoute && token) {
    const role = (token as any).role;

    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      const redirectUrl = safeRedirectPath(
        request.nextUrl.searchParams.get("redirect"),
        role === "SUPER_ADMIN" ? "/admin" : "/admin/pos",
      );

      return redirect(new URL(redirectUrl, request.url));
    }

    return redirect(new URL("/", request.url));
  }

  // Handle customer protected routes
  if (isCustomerProtectedRoute && !token) {
    const url = new URL("/log-in", request.url);
    url.searchParams.set("redirect", path);
    return redirect(url);
  }

  return next();
}

export const config = {
  // Every page, so every document carries the policy. Static assets, images
  // and API responses are not documents and are left alone.
  matcher: [
    "/((?!api|_next/static|_next/image|images|favicon.ico|icon.png|apple-icon.png|site.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
