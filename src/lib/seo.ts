const FALLBACK_SITE_URL = "https://metroopticals.lk";

const normalizeSiteUrl = (value: string) => value.replace(/\/+$/, "");

export const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    FALLBACK_SITE_URL
);

export const buildSiteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
};
