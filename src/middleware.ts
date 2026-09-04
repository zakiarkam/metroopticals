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
/**
 * The card gateway's origin, for `form-action`, when one is switched on.
 *
 * Scoped by environment and not by path, deliberately. A policy binds to the
 * document that carried it, and an App Router navigation replaces no
 * document: a shopper reaching /checkout from the cart is still running the
 * cart's policy, so a per-path exception would never be the one in force at
 * the moment the payment form is submitted. The browser would block the
 * hand-off silently - no error to catch, no page to show - and the order
 * would sit unpaid with its stock held.
 *
 * So: one origin, site-wide, only while the gateway is on, and only the one
 * actually in use - production never permits posting to the sandbox host.
 */
const paymentFormAction = () => {
  if (process.env.NEXT_PUBLIC_PAYHERE_ENABLED?.trim() !== "true") return "";
  return process.env.NEXT_PUBLIC_PAYHERE_MODE?.trim().toLowerCase() === "live"
    ? " https://www.payhere.lk"
    : " https://sandbox.payhere.lk";
};

const buildCsp = (nonce: string, path: string) => {
  const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  const dev = process.env.NODE_ENV !== "production";

  // The virtual try-on compiles WebAssembly (face tracking), spawns decoder
  // workers from blob URLs and fetches its runtime and frame models from the
  // bucket. None of that is needed anywhere else, so the wider policy is
  // scoped to the pages that run it: the product page and the admin product
  // editor, whose preview uses the same component. 'wasm-unsafe-eval' only
  // permits WebAssembly compilation  it is much narrower than 'unsafe-eval',
  // which must never be added here in production because it would override it.
  const tryOn = isTryOnPage(path);
  const tryOnOrigins = [r2, tryOnRuntimeOrigin()].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    // Next needs 'unsafe-eval' only for its dev-mode React refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${tryOn ? " 'wasm-unsafe-eval'" : ""}${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: https:${r2 ? ` ${r2}` : ""}`,
    `connect-src 'self'${tryOn && tryOnOrigins ? ` ${tryOnOrigins}` : ""}`,
    ...(tryOn ? ["worker-src 'self' blob:", "media-src 'self' blob:"] : []),
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    // Paying by card is a form POST to PayHere, which `form-action 'self'`
    // would block outright. Nothing else on the site may post anywhere but
    // here, which is what stops an injected form being used to exfiltrate
    // what a customer typed.
    `form-action 'self'${paymentFormAction()}`,
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
};

const isTryOnPage = (path: string) =>
  path.startsWith("/shop-details") ||
  path.startsWith("/admin/products") ||
  path.startsWith("/admin/try-on-lab");

/**
 * Origin the try-on runtime (WebAssembly, landmark model, decoders) is served
 * from when it lives outside the app  normally the bucket, which charges
 * nothing for egress. Same-origin when unset, which needs no extra source.
 */
const tryOnRuntimeOrigin = () => {
  const url = process.env.NEXT_PUBLIC_TRYON_RUNTIME_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

const withCsp = (
  request: NextRequest,
  response: NextResponse,
  nonce: string,
  path: string,
) => {
  response.headers.set("Content-Security-Policy", buildCsp(nonce, path));
  return response;
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // A fresh nonce for this response, passed to Next through the request so
  // its inline scripts carry it.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", buildCsp(nonce, path));
  const next = () =>
    withCsp(
      request,
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
      path,
    );
  const redirect = (url: URL) =>
    withCsp(request, NextResponse.redirect(url), nonce, path);

  const isAdminRoute = path.startsWith("/admin");
  const isAuthAdminRoute = path === "/log-in";
  const isCustomerProtectedRoute =
    path.startsWith("/checkout") || path.startsWith("/my-account");

  // Public pages need only the policy header; no session lookup.
  if (!isAdminRoute && !isAuthAdminRoute && !isCustomerProtectedRoute) {
    return next();
  }

  const secureCookie = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  const rawToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    // The cookie name follows the scheme the app is actually served on;
    // probing both lets a session cookie be read under the wrong prefix.
    secureCookie,
  });

  // The auth callbacks retire a session  account removed, password
  // changed, a staff login older than a shift  by stripping its identity
  // rather than deleting the cookie, so the cookie still decodes to a token
  // with no id. Every API route already refuses such a token; treating it as
  // signed in here sent /log-in back to the home page, where the first 401
  // sent the browser to /log-in again, without end. A token with no usable
  // id is no session, and its cookie is cleared on the way out.
  const token =
    rawToken && Number.isInteger(Number((rawToken as { id?: unknown }).id))
      ? rawToken
      : null;
  const deadCookie = rawToken && !token;
  const clearDeadCookie = (response: NextResponse) => {
    if (deadCookie) {
      response.cookies.delete(
        secureCookie
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      );
    }
    return response;
  };

  // Handle admin routess
  if (isAdminRoute) {
    if (!token) {
      const url = new URL("/log-in", request.url);
      url.searchParams.set("redirect", path);
      return clearDeadCookie(redirect(url));
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
    return clearDeadCookie(redirect(url));
  }

  // The log-in page itself, reached with a retired cookie: show it, and
  // take the cookie away so the client stops believing it is signed in.
  return clearDeadCookie(next());
}

export const config = {
  // Every page, so every document carries the policy. Static assets, images
  // and API responses are not documents and are left alone.
  matcher: [
    "/((?!api|_next/static|_next/image|images|favicon.ico|icon.png|apple-icon.png|site.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
