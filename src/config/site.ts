export const siteConfig = {
  /** Short brand name used in UI. */
  name: "Metro Opticals",
  /** Registered legal entity, used on receipts and invoices. */
  legalName: "Metro Opticals",
  /** Domain shown to customers. */
  domain: "metroopticals.lk",
  /** Short tagline. */
  tagline: "Eyewear, Lenses & Eye Care",
  description:
    "Metro Opticals is your trusted optical store for prescription eyeglasses, sunglasses, contact lenses and professional eye care in Sri Lanka.",

  contact: {
    email: "hello@metroopticals.lk",
    /** Displayed phone number. */
    phone: "076 663 8682",
    /** tel: link format. */
    phoneHref: "tel:+94766638682",
    /** Digits only, for wa.me links. */
    whatsapp: "94766638682",
    address: "No 98, Super Commercial Complex, Nawalapitiya, Sri Lanka.",
  },

  banking: {
    accountName: "Metro Opticals",
    accountNumber: "0000000000",
    bank: "Bank Name",
    branch: "Branch Name",
  },

  social: {
    instagram: "https://www.instagram.com/metropticals",
    tiktok: "https://www.tiktok.com/@metropticals",
    whatsapp: "https://wa.me/94766638682",
  },

  logo: "/images/logo/logo.png",
  logoOnDark: "/images/logo/logo-dark-bg.png",
  logoMark: "/images/logo/logo-mark.png",

  /** 1200x630 social sharing card (Open Graph / Twitter). */
  ogImage: "/images/logo/og-image.png",

  /** Brand colours, kept in sync with the manifest and theme-color meta. */
  themeColor: "#FAF8F4",
  /** Gold accent  the deepened tone used for UI, see tailwind.config.ts. */
  accentColor: "#8F6A37",
} as const;

export type SiteConfig = typeof siteConfig;
