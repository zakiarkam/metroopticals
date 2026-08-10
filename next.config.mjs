/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },

  // Standalone output for Docker/production
  output: "standalone",

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
