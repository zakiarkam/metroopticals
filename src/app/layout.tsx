import "./css/style.css";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import Providers from "./providers";
import "@/styles/toast.css";
import { ToastContainer } from "@/components/common/ToastContainer";
import { siteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ogImage = siteConfig.ogImage;

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
};

// Every page is rendered per request so Next can stamp this request's CSP
// nonce onto its script tags. A page pre-rendered at build time carries no
// nonce, and under `'strict-dynamic'` the browser would refuse its scripts.
// The shop is small and mostly dynamic already; the cost is negligible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
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
  applicationName: siteConfig.name,
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${poppins.className}`}>
        <Providers>{children}</Providers>
        <ToastContainer />
      </body>
    </html>
  );
}
