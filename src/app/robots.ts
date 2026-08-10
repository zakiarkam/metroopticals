import type { MetadataRoute } from "next";
import { buildSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/log-in",
          "/admin-login",
          "/reset-password",
          "/my-account",
          "/cart",
          "/checkout",
          "/wishlist",
          "/order-confirmation",
          "/mail-success",
          "/api",
        ],
      },
    ],
    sitemap: buildSiteUrl("/sitemap.xml"),
    host: buildSiteUrl("/"),
  };
}
