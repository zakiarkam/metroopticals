import "./css/style.css";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import Providers from "./providers";
// import { Provider } from "@/components/ui/provider";
import "@/styles/toast.css";
import { ToastContainer } from "@/components/common/ToastContainer";
import { siteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";

/**
 * One family, the whole site.
 *
 * Poppins is a geometric sans  circular bowls, straight-tailed descenders,
 * horizontal terminals  which is the look the brief asked for. Running a
 * single family across headings, body, navigation and the admin is what makes
 * the result read as a designed system rather than a page with two fonts on it;
 * hierarchy comes from weight, size and tracking instead.
 *
 * Exposed on two variables so Tailwind keeps addressing `font-sans` and
 * `font-display` separately. They resolve to the same face today, which means
 * swapping the display face later is a one-line change here rather than an
 * edit to every heading in the codebase.
 *
 * Weights are limited to the four actually used (regular through bold)
 * every extra weight is another font file on the critical path.
 */
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
      <body className={`${poppins.variable} ${poppins.className}`}>
        <Providers>{children}</Providers>
        <ToastContainer />
      </body>
    </html>
  );
}
