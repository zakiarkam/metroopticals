import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The bucket host comes from the same variable the storefront builds image
// URLs from, so a bucket change cannot silently break next/image.
const r2Host = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").hostname;
  } catch {
    return "pub-04bc2daeed7142b7b30174b3890fc622.r2.dev";
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),

  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Image optimization configuration
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket (r2.dev subdomain).
      {
        protocol: "https",
        hostname: r2Host,
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
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Don't advertise the framework to every visitor.
  poweredByHeader: false,

  // Railway terminates TLS and proxies to the container; gzip here still helps
  // because the proxy forwards the response body as-is.
  compress: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
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
};

export default nextConfig;
