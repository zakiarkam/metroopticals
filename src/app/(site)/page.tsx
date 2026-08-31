import { Metadata } from "next";
import Home from "@/features/home/components";
import SiteIntro from "@/components/common/SiteIntro";
import { siteConfig } from "@/config/site";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s | Metro Opticals" template.
  title: { absolute: `${siteConfig.name} - ${siteConfig.tagline}` },
  description: siteConfig.description,
  alternates: { canonical: buildSiteUrl("/") },
  keywords: [
    "opticals",
    "eyeglasses",
    "prescription glasses",
    "sunglasses",
    "contact lenses",
    "eye care",
    "optical store Sri Lanka",
  ],
  openGraph: {
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    type: "website",
    url: buildSiteUrl("/"),
  },
};

// ✅ Force dynamic rendering to avoid build-time database connections
// This prevents Docker build failures when database is not available
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      {/* Home page only, and only on a real page load — see SiteIntro. */}
      <SiteIntro />
      <Home />
    </>
  );
}
