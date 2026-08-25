import React from "react";
import Link from "next/link";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Youtube,
} from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import NewsletterForm from "./NewsletterForm";
import { getSiteBlocks } from "@/features/site-content/services/site-content-service";
import { getBrands } from "@/features/brands/services/brand-service";
import { getCategories } from "@/features/categories/services/category-service";
import { getStockedGenders } from "@/features/products/services/product-service";
import { GENDER_LABELS } from "@/features/products/utils/eyewear";
import { siteConfig } from "@/config/site";

/** Brand marks lucide does not ship, drawn inline at the same weight. */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .74-5.07v-3.1a5.66 5.66 0 0 0-.74-.05 5.68 5.68 0 1 0 5.68 5.68V9.42a7.35 7.35 0 0 0 4.29 1.38V7.7a4.29 4.29 0 0 1-3.23-1.88z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.22-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23zm-1.16 17.52h1.83L7.01 4.13H5.05z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.36A9.9 9.9 0 1 0 12.04 2zm0 1.86a8.05 8.05 0 1 1-4.1 14.97l-.29-.17-3.08.8.82-3-.19-.31A8.05 8.05 0 0 1 12.04 3.86zm4.63 10.2c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12s-.64.8-.79.97c-.14.16-.29.18-.54.06a6.6 6.6 0 0 1-1.94-1.2 7.3 7.3 0 0 1-1.34-1.67c-.14-.24 0-.37.11-.49.11-.11.25-.29.37-.44.12-.15.16-.25.24-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.75 2.75 0 0 0-.86 2.05c0 1.2.88 2.37 1 2.53.12.16 1.72 2.63 4.17 3.69.58.25 1.04.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.68-1.19.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29z" />
  </svg>
);

const SOCIAL_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: TikTokIcon,
  whatsapp: WhatsAppIcon,
  x: XIcon,
};

async function NewsletterBar() {
  const block = (await getSiteBlocks(["footer.newsletter"]))[
    "footer.newsletter"
  ];
  if (!block?.enabled) return null;

  return (
    <section className="bg-blue-light">
      <SiteContainer>
        <div className="grid gap-6 py-10 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-12">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold leading-tight tracking-[-0.03em] text-dark sm:text-[1.85rem]">
              {block.headline}
            </h2>
            {block.note && (
              <p className="mt-3 max-w-xl text-[12px] leading-relaxed text-dark-2/75">
                {block.note}
              </p>
            )}
          </div>

          <NewsletterForm
            placeholder={block.placeholder}
            buttonLabel={block.buttonLabel}
          />
        </div>
      </SiteContainer>
    </section>
  );
}

type FooterLink = { label?: string; href?: string };
type FooterColumn = {
  title?: string;
  source?: "" | "categories" | "brands" | "genders";
  links?: FooterLink[];
};
type FooterSocial = { platform?: string; href?: string };

const shopLink = (query: string) => `/shop-with-sidebar?${query}`;

export default async function Footer() {
  // Catalogue-sourced columns need the live tables. Both are optional  a
  // failure costs that column, not the footer.
  const [content, brands, categoryPage, genders] = await Promise.all([
    getSiteBlocks(["footer.columns", "footer.social"]),
    getBrands().catch(() => []),
    getCategories({ limit: 12, status: "active" }).catch(() => null),
    getStockedGenders().catch(() => []),
  ]);

  const authored = (content["footer.columns"]?.columns ?? []) as FooterColumn[];
  const socials = (content["footer.social"]?.items ?? []) as FooterSocial[];
  const year = new Date().getFullYear();

  const categoryLinks: FooterLink[] = (categoryPage?.categories ?? [])
    .filter((category: { parentId?: number | null }) => !category.parentId)
    .map((category: { name: string; slug: string }) => ({
      label: category.name,
      href: shopLink(`categories=${encodeURIComponent(category.slug)}`),
    }));

  const brandLinks: FooterLink[] = brands
    .filter((brand) => brand.productCount > 0)
    .map((brand) => ({
      label: brand.name,
      href: shopLink(`brands=${encodeURIComponent(brand.slug)}`),
    }));

  const genderLinks: FooterLink[] = genders.map(({ value }) => ({
    label: GENDER_LABELS[value] ?? value,
    href: shopLink(`genders=${value}`),
  }));

  const columns = authored
    .map((column) => {
      if (column.source === "categories")
        return { ...column, links: categoryLinks };
      if (column.source === "brands") return { ...column, links: brandLinks };
      if (column.source === "genders") return { ...column, links: genderLinks };
      return column;
    })
    .filter((column) => (column.links ?? []).length > 0);

  return (
    <>
      <NewsletterBar />

      <footer className="bg-dark text-white">
        <SiteContainer>
          <div className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)] lg:gap-16">
            {/* ------------------------- brand column ------------------------ */}
            <div>
              <p className="font-display text-[1.4rem] font-bold tracking-[-0.03em]">
                {siteConfig.name}
              </p>
              <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-white/60">
                {siteConfig.tagline}
              </p>

              <ul className="mt-6 space-y-3 text-[13.5px] text-white/70">
                {siteConfig.contact?.phone && (
                  <li>
                    <a
                      href={siteConfig.contact.phoneHref}
                      className="flex items-center gap-2.5 transition-colors hover:text-blue-light"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-blue-light" />
                      {siteConfig.contact.phone}
                    </a>
                  </li>
                )}
                {siteConfig.contact?.email && (
                  <li>
                    <a
                      href={`mailto:${siteConfig.contact.email}`}
                      className="flex items-center gap-2.5 break-all transition-colors hover:text-blue-light"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-blue-light" />
                      {siteConfig.contact.email}
                    </a>
                  </li>
                )}
                {siteConfig.contact?.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-light" />
                    <span>{siteConfig.contact.address}</span>
                  </li>
                )}
              </ul>

              {socials.length > 0 && (
                <div className="mt-7 flex items-center gap-2.5">
                  {socials.map((social, index) => {
                    const Icon =
                      SOCIAL_ICONS[social.platform ?? ""] ?? Facebook;
                    return (
                      <a
                        key={index}
                        href={social.href || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.platform}
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-blue-light hover:text-blue-light"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ------------------------- link columns ------------------------ */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {columns.map((column, index) => (
                <nav key={index} aria-label={column.title}>
                  <p className="text-[13.5px] font-bold text-white">
                    {column.title}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {(column.links ?? []).map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link
                          href={link.href || "#"}
                          className="text-[13.5px] text-white/65 transition-colors hover:text-blue-light"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-[12.5px] text-white/50 sm:flex-row">
            <p>
              © {year} {siteConfig.name}. All rights reserved.
            </p>
            <p>Prices in Sri Lankan Rupees (LKR).</p>
          </div>
        </SiteContainer>
      </footer>
    </>
  );
}
