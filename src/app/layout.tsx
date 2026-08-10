import "./css/style.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";
// import { Provider } from "@/components/ui/provider";
import "@/styles/toast.css";
import { ToastContainer } from "@/components/common/ToastContainer";
import { siteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";

const inter = Inter({ subsets: ["latin"] });

const ogImage = siteConfig.ogImage;

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
};

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
  alternates: {
    canonical: "/",
  },
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
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <ToastContainer />
      </body>
    </html>
  );
}
