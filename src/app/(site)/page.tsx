import nextDynamic from "next/dynamic";
import Loading from "./loading";
import { Metadata } from "next";
import Home from "@/features/home/components";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s | Metro Opticals" template.
  title: { absolute: `${siteConfig.name} - ${siteConfig.tagline}` },
  description: siteConfig.description,
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
  },
};

// ✅ Force dynamic rendering to avoid build-time database connections
// This prevents Docker build failures when database is not available
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <Home />;
}
