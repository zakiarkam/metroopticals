/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Standalone output for Docker/production
  output: "standalone",

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
