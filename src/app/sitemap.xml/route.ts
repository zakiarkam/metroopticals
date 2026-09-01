import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildSiteUrl } from "@/lib/seo";
import { lensSlugs } from "@/config/lenses";

export const dynamic = "force-dynamic";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toIso = (value?: Date | string) => {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
};

type SitemapUrl = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

const buildSitemapXml = (urls: SitemapUrl[]) => {
  const items = urls
    .map((item) => {
      const lastmod = toIso(item.lastModified);
      const changefreq = item.changeFrequency;
      const priority =
        typeof item.priority === "number"
          ? item.priority.toFixed(1)
          : undefined;

      return [
        "  <url>",
        `    <loc>${escapeXml(item.url)}</loc>`,
        lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : "",
        changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
        priority ? `    <priority>${priority}</priority>` : "",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    "</urlset>",
  ].join("\n");
};

export async function GET() {
  const staticRoutes: SitemapUrl[] = [
    {
      url: buildSiteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildSiteUrl("/contact"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: buildSiteUrl("/faq"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: buildSiteUrl("/privacy"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: buildSiteUrl("/terms"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: buildSiteUrl("/refund-policy"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: buildSiteUrl("/shop-with-sidebar"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: buildSiteUrl("/lenses"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // The lens guides are static pages built from `@/config/lenses`, so they
    // are listed straight from that module rather than hand-maintained here.
    ...lensSlugs.map((slug) => ({
      url: buildSiteUrl(`/lenses/${slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  let productRoutes: SitemapUrl[] = [];

  try {
    const products = await prisma.product.findMany({
      where: { status: { not: "INACTIVE" } },
      select: {
        id: true,
        updatedAt: true,
        status: true,
      },
    });

    productRoutes = products
      .filter((product) => product.status !== "INACTIVE")
      .map((product) => ({
        url: buildSiteUrl(`/shop-details/${product.id}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }));
  } catch (error) {
    console.warn("Sitemap: unable to load product URLs", error);
  }

  const xml = buildSitemapXml([...staticRoutes, ...productRoutes]);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
