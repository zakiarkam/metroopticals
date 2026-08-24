import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * Pin the workspace root. Without this, Next walks up looking for a lockfile
   * and can settle on one outside the project (e.g. a stray ~/package-lock.json),
   * which makes file tracing resolve against the wrong directory.
   */
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),

  /*
   * A second `next dev` (or a `next build` run alongside one) writes into the
   * same `.next` and leaves the running server with a half-deleted module
   * graph. Set NEXT_DIST_DIR to give the extra process its own directory.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Image optimization configuration
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (r2.dev subdomain).
      {
        protocol: "https",
        hostname: "pub-04bc2daeed7142b7b30174b3890fc622.r2.dev",
        pathname: "/**",
      },
      // Custom domain for R2, once DNS is pointed at the bucket.
      {
        protocol: "https",
        hostname: "cdn.metroopticals.lk",
        pathname: "/**",
      },
    ],
    // Optimize cache and device sizes for production
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600 * 24 * 365, // 1 year for production
    /*
     * The bundled placeholder and campaign artwork are SVGs. The optimizer
     * refuses SVG unless this is set; the CSP below keeps a served SVG from
     * executing script, which is the reason the flag is opt-in.
     */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  /*
   * Railway runs `next start` against the normal build output, so the extra
   * `.next/standalone` tree the Docker image used to copy is no longer built.
   */

  // Don't advertise the framework to every visitor.
  poweredByHeader: false,

  // Railway terminates TLS and proxies to the container; gzip here still helps
  // because the proxy forwards the response body as-is.
  compress: true,

  /*
   * Security headers.
   *
   * These used to be set by nginx in front of the app. Railway's proxy does not
   * add them, so the app has to — otherwise removing nginx would have quietly
   * dropped HSTS and clickjacking protection.
   *
   * No Content-Security-Policy here on purpose: Chakra/Emotion inject inline
   * styles at runtime, so a policy strict enough to be worth having would need
   * a nonce pipeline through the whole render tree. That is a separate piece of
   * work, not a deployment config change.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Railway serves every deployment over HTTPS, so this is safe to
            // send unconditionally. No `preload` — that is a public-list
            // commitment and should be a deliberate, separate decision.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Bundled artwork under public/images is content-addressed by release,
        // so it can be cached hard. nginx used to do this.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800" },
        ],
      },
    ];
  },

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
