import type {
  BlockDefinition,
  Field,
} from "@/features/site-content/types/site-content";

/**
 * The storefront content registry.
 *
 * Everything on the site that is not catalogue data is declared here once. Each
 * entry carries the admin form schema AND the dummy content the site ships
 * with, which is why a fresh install already looks like a finished shop: the
 * read helper falls back to `defaults` whenever a block has never been saved.
 *
 * The registry is deliberately short. Anything the catalogue already knows
 * categories, brands, frame shapes, price bands  is rendered from the database
 * and filtered through `/shop-with-sidebar`, not duplicated here as editable
 * copy that drifts out of step with what is actually in stock.
 *
 * Copy and pricing are Sri Lankan throughout (LKR, Colombo, local delivery),
 * so the placeholder text reads as the real shop rather than lorem ipsum.
 */

/** Icon names the storefront knows how to draw. Keep in sync with `iconMap`. */
export const ICON_OPTIONS = [
  { value: "shield", label: "Shield" },
  { value: "truck", label: "Delivery" },
  { value: "refresh", label: "Returns" },
  { value: "headset", label: "Support" },
  { value: "star", label: "Star" },
  { value: "eye", label: "Eye" },
  { value: "glasses", label: "Glasses" },
  { value: "sparkles", label: "Sparkles" },
  { value: "tag", label: "Tag" },
  { value: "flame", label: "Hot" },
  { value: "gem", label: "Premium" },
  { value: "wallet", label: "Price" },
];

const SOCIAL_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X / Twitter" },
  { value: "whatsapp", label: "WhatsApp" },
];

/**
 * Columns that fill themselves from the catalogue.
 *
 * A sourced column lists only values that have stock behind them and links
 * straight into the matching shop filter, so it cannot go stale and cannot
 * send a shopper to an empty grid.
 */
const NAV_SOURCE_OPTIONS = [
  { value: "", label: "None  use the links below" },
  { value: "genders", label: "Every stocked wearer (women, men, kids…)" },
  { value: "shapes", label: "Every stocked frame shape" },
  { value: "brands", label: "Every stocked brand" },
];

const FOOTER_SOURCE_OPTIONS = [
  { value: "", label: "None  use the links below" },
  { value: "categories", label: "Every active category" },
  { value: "genders", label: "Every stocked wearer" },
  { value: "brands", label: "Every stocked brand" },
];

/* ------------------------------------------------------------------ helpers */

const linkFields: Field[] = [
  { name: "label", label: "Label", type: "text" },
  {
    name: "href",
    label: "Links to",
    type: "link",
    placeholder: "/shop-with-sidebar",
  },
];

const D = "/images/dummy";

/** A shop link with the given query string already applied. */
const shop = (query = "") => `/shop-with-sidebar${query ? `?${query}` : ""}`;

/* ------------------------------------------------------------------- blocks */

export const BLOCKS: BlockDefinition[] = [
  /* =============================== GLOBAL =============================== */
  {
    key: "announcement.bar",
    label: "Announcement bar",
    group: "Global",
    description:
      "The slim strip above the header. Best used for one offer or one piece of news.",
    fields: [
      { name: "enabled", label: "Show the bar", type: "boolean" },
      { name: "message", label: "Message", type: "text" },
      { name: "ctaLabel", label: "Link text", type: "text" },
      { name: "ctaHref", label: "Link target", type: "link" },
      { name: "rightLabel", label: "Right-hand link", type: "text" },
      { name: "rightHref", label: "Right-hand link target", type: "link" },
    ],
    defaults: {
      enabled: true,
      message: "Island-wide delivery in 2 days  order before 2pm.",
      ctaLabel: "Shop now",
      ctaHref: shop(),
      rightLabel: "Book an eye test",
      rightHref: "/contact",
    },
  },
  {
    key: "site.trust",
    label: "Trust bar",
    group: "Global",
    description:
      "The reassurance row shown under the hero and on product pages.",
    fields: [
      {
        name: "items",
        label: "Promises",
        type: "repeater",
        itemLabel: "promise",
        titleField: "label",
        max: 4,
        fields: [
          {
            name: "icon",
            label: "Icon",
            type: "select",
            options: ICON_OPTIONS,
          },
          { name: "label", label: "Title", type: "text" },
          { name: "copy", label: "Supporting line", type: "textarea", rows: 2 },
        ],
        defaultItem: { icon: "shield", label: "New promise", copy: "" },
      },
    ],
    defaults: {
      items: [
        {
          icon: "eye",
          label: "Free eye test",
          copy: "20-minute check with our optometrist, no appointment needed.",
        },
        {
          icon: "sparkles",
          label: "Lenses fitted in-store",
          copy: "Anti-glare, blue-light and UV coatings cut on our own edger.",
        },
        {
          icon: "truck",
          label: "Island-wide delivery",
          copy: "Dispatched within 2 working days, tracked to your door.",
        },
        {
          icon: "shield",
          label: "12-month warranty",
          copy: "Free adjustments and nose-pad replacements for life.",
        },
      ],
    },
  },

  /* ============================= NAVIGATION ============================= */
  {
    key: "header.nav",
    label: "Main navigation",
    group: "Navigation",
    description:
      "The menu bar and its drop-down panels. Each item can list its own link columns, or pull a column straight from the catalogue  pick 'Every active brand' or 'Every frame shape' and the panel stays in step with the shop on its own.",
    fields: [
      {
        name: "items",
        label: "Menu items",
        type: "repeater",
        itemLabel: "menu item",
        titleField: "label",
        max: 7,
        fields: [
          { name: "label", label: "Label", type: "text" },
          { name: "href", label: "Links to", type: "link" },
          { name: "accent", label: "Highlight in red", type: "boolean" },
          {
            name: "badge",
            label: "Badge text",
            type: "text",
            placeholder: "New",
          },
          {
            name: "columns",
            label: "Link columns",
            type: "repeater",
            itemLabel: "column",
            titleField: "title",
            // Four fits the 1440px panel without wrapping; the Lenses menu
            // needs all four to list the lens-type guides beside the shop
            // links. The panel itself renders any number.
            max: 4,
            fields: [
              { name: "title", label: "Column heading", type: "text" },
              {
                name: "source",
                label: "Fill from the catalogue",
                type: "select",
                options: NAV_SOURCE_OPTIONS,
              },
              {
                name: "links",
                label: "Links",
                type: "repeater",
                itemLabel: "link",
                titleField: "label",
                max: 8,
                fields: [
                  ...linkFields,
                  {
                    name: "accent",
                    label: "Highlight in red",
                    type: "boolean",
                  },
                ],
                defaultItem: { label: "New link", href: shop(), accent: false },
              },
            ],
            defaultItem: { title: "New column", source: "", links: [] },
          },
          {
            name: "promoImage",
            label: "Promo image",
            type: "image",
            aspect: "16 / 9",
            recommended: "640 × 360px",
          },
          { name: "promoTitle", label: "Promo title", type: "text" },
          { name: "promoCopy", label: "Promo line", type: "textarea", rows: 2 },
          { name: "promoCtaLabel", label: "Promo link text", type: "text" },
          { name: "promoCtaHref", label: "Promo link target", type: "link" },
        ],
        defaultItem: {
          label: "New menu",
          href: shop(),
          accent: false,
          badge: "",
          columns: [],
          promoImage: "",
          promoTitle: "",
          promoCopy: "",
          promoCtaLabel: "",
          promoCtaHref: "",
        },
      },
    ],
    defaults: {
      items: [
        {
          label: "Eyeglasses",
          href: shop(),
          accent: false,
          badge: "",
          columns: [
            { title: "Shop by wearer", source: "genders", links: [] },
            { title: "Frame shape", source: "shapes", links: [] },
            {
              title: "Popular",
              source: "",
              links: [
                {
                  label: "New arrivals",
                  href: shop("sortBy=createdAt&sortOrder=desc"),
                  accent: false,
                },
                {
                  label: "Under Rs 2,900",
                  href: shop("maxPrice=2900"),
                  accent: false,
                },
                {
                  label: "Under Rs 4,900",
                  href: shop("maxPrice=4900"),
                  accent: false,
                },
                { label: "On sale", href: shop("onSale=true"), accent: true },
              ],
            },
          ],
          promoImage: `${D}/promo/affordable.svg`,
          promoTitle: "Two pairs, one price",
          promoCopy: "Buy a frame and take the second at 65% off.",
          promoCtaLabel: "See the offer",
          promoCtaHref: shop("onSale=true"),
        },
        {
          label: "Sunglasses",
          href: shop("categories=sunglasses"),
          accent: false,
          badge: "",
          columns: [
            { title: "Shop by wearer", source: "genders", links: [] },
            { title: "Frame shape", source: "shapes", links: [] },
            {
              title: "Browse",
              source: "",
              links: [
                {
                  label: "All sunglasses",
                  href: shop("categories=sunglasses"),
                  accent: false,
                },
                {
                  label: "Cheapest first",
                  href: shop(
                    "categories=sunglasses&sortBy=price&sortOrder=asc",
                  ),
                  accent: false,
                },
                {
                  label: "On sale",
                  href: shop("categories=sunglasses&onSale=true"),
                  accent: true,
                },
              ],
            },
          ],
          promoImage: `${D}/promo/onsale.svg`,
          promoTitle: "Sun season",
          promoCopy: "Polarised lenses on every style in the edit.",
          promoCtaLabel: "Shop sunglasses",
          promoCtaHref: shop("categories=sunglasses"),
        },
        {
          /*
           * The lens-type columns mirror `@/config/lenses`  that module is the
           * source of the guide pages, and these links point at them. Add a lens
           * type there and add its row here; the two are matched by slug, so a
           * typo lands on a 404 rather than an empty grid.
           */
          label: "Lenses",
          href: "/lenses",
          accent: false,
          badge: "",
          columns: [
            {
              title: "Lens type",
              source: "",
              links: [
                {
                  label: "U/C (Uncoated)",
                  href: "/lenses/uncoated",
                  accent: false,
                },
                { label: "Blue Cut", href: "/lenses/blue-cut", accent: false },
                {
                  label: "Blue Filter",
                  href: "/lenses/blue-filter",
                  accent: false,
                },
                {
                  label: "Photochromic",
                  href: "/lenses/photochromic",
                  accent: false,
                },
                {
                  label: "Polarized",
                  href: "/lenses/polarized",
                  accent: false,
                },
              ],
            },
            {
              title: "Vision & premium",
              source: "",
              links: [
                { label: "Bifocal", href: "/lenses/bifocal", accent: false },
                {
                  label: "Progressive",
                  href: "/lenses/progressive",
                  accent: false,
                },
                {
                  label: "Neo Vision",
                  href: "/lenses/neo-vision",
                  accent: false,
                },
                { label: "Omega", href: "/lenses/omega", accent: false },
                { label: "All lens types", href: "/lenses", accent: true },
              ],
            },
            {
              title: "Shop lenses",
              source: "",
              links: [
                {
                  label: "Contact lenses",
                  href: shop("categories=contact-lenses"),
                  accent: false,
                },
                {
                  label: "Reading glasses",
                  href: shop("categories=reading-glasses"),
                  accent: false,
                },
                {
                  label: "Lens care & accessories",
                  href: shop("categories=accessories"),
                  accent: false,
                },
              ],
            },
            {
              title: "In store & guides",
              source: "",
              links: [
                { label: "Book an eye test", href: "/contact", accent: false },
                {
                  label: "Lens fitting service",
                  href: "/contact",
                  accent: false,
                },
                {
                  label: "How to read a prescription",
                  href: "/faq",
                  accent: false,
                },
                {
                  label: "How to measure your PD",
                  href: "/faq",
                  accent: false,
                },
                { label: "Frame size guide", href: "/faq", accent: false },
              ],
            },
          ],
          promoImage: "/images/lenses/guide.jpg",
          promoTitle: "Which lens is right for you?",
          promoCopy: "Nine lens types, what each one does  and what it won't.",
          promoCtaLabel: "Read the lens guide",
          promoCtaHref: "/lenses",
        },
        {
          label: "Brands",
          href: shop(),
          accent: false,
          badge: "",
          columns: [{ title: "All brands", source: "brands", links: [] }],
          promoImage: "",
          promoTitle: "",
          promoCopy: "",
          promoCtaLabel: "",
          promoCtaHref: "",
        },
        {
          label: "Offers",
          href: shop("onSale=true"),
          accent: true,
          badge: "",
          columns: [],
          promoImage: "",
          promoTitle: "",
          promoCopy: "",
          promoCtaLabel: "",
          promoCtaHref: "",
        },
        {
          label: "Eye test",
          href: "/contact",
          accent: false,
          badge: "Book",
          columns: [],
          promoImage: "",
          promoTitle: "",
          promoCopy: "",
          promoCtaLabel: "",
          promoCtaHref: "",
        },
      ],
    },
  },

  /* ================================ HOME ================================ */
  {
    key: "home.hero",
    label: "Hero panel",
    group: "Home",
    description:
      "The headline, supporting line and buttons at the top of the home page.",
    fields: [
      { name: "eyebrow", label: "Small heading", type: "text" },
      { name: "headline", label: "Headline", type: "text" },
      {
        name: "headlineSecondLine",
        label: "Headline, second line",
        type: "text",
      },
      {
        name: "body",
        label: "Supporting paragraph",
        type: "textarea",
        rows: 3,
      },
      { name: "ctaLabel", label: "Button text", type: "text" },
      { name: "ctaHref", label: "Button target", type: "link" },
      { name: "secondaryLabel", label: "Second button", type: "text" },
      { name: "secondaryHref", label: "Second button target", type: "link" },
      {
        name: "hoursNote",
        label: "Small print under the buttons",
        type: "text",
      },
    ],
    defaults: {
      eyebrow: "Free eye test with every pair",
      headline: "Glasses that fit",
      headlineSecondLine: "your face and your budget",
      body: "Prescription frames from Rs 2,900, cut and fitted in Colombo. Choose a frame, add your lenses, and we deliver island-wide in two days.",
      ctaLabel: "Shop eyeglasses",
      ctaHref: shop(),
      secondaryLabel: "Book an eye test",
      secondaryHref: "/contact",
      hoursNote: "Mon–Sun · 9am – 7pm · Walk-ins welcome",
    },
  },
  {
    key: "home.promos",
    label: "Promo banners",
    group: "Home",
    description: "Two campaign banners in the middle of the home page.",
    fields: [
      {
        name: "items",
        label: "Banners",
        type: "repeater",
        itemLabel: "banner",
        titleField: "title",
        max: 2,
        fields: [
          {
            name: "image",
            label: "Image",
            type: "image",
            aspect: "7 / 4",
            recommended: "1400 × 800px",
          },
          { name: "eyebrow", label: "Small heading", type: "text" },
          { name: "title", label: "Title", type: "text" },
          { name: "ctaLabel", label: "Button text", type: "text" },
          { name: "href", label: "Links to", type: "link" },
        ],
        defaultItem: {
          image: "",
          eyebrow: "",
          title: "New banner",
          ctaLabel: "Shop now",
          href: shop(),
        },
      },
    ],
    defaults: {
      items: [
        {
          image: `${D}/promo/wide-lenses.svg`,
          eyebrow: "Lens event",
          title: "55% off every lens upgrade",
          ctaLabel: "Shop lenses",
          href: shop(),
        },
        {
          image: `${D}/promo/wide-brands.svg`,
          eyebrow: "Designer",
          title: "Premium brands, island prices",
          ctaLabel: "Shop brands",
          href: shop(),
        },
      ],
    },
  },

  /* =============================== FOOTER =============================== */
  {
    key: "footer.newsletter",
    label: "Newsletter bar",
    group: "Footer",
    description: "The sign-up band above the footer.",
    fields: [
      { name: "enabled", label: "Show the bar", type: "boolean" },
      { name: "headline", label: "Headline", type: "text" },
      { name: "note", label: "Small print", type: "textarea", rows: 3 },
      { name: "placeholder", label: "Field placeholder", type: "text" },
      { name: "buttonLabel", label: "Button text", type: "text" },
    ],
    defaults: {
      enabled: true,
      headline: "New arrivals and offers, before everyone else",
      note: "By subscribing you confirm you are over 18 and agree that Metro Opticals may email you news and offers.",
      placeholder: "Your email address",
      buttonLabel: "Subscribe",
    },
  },
  {
    key: "footer.columns",
    label: "Footer links",
    group: "Footer",
    description:
      "The link columns in the dark footer. A column set to a catalogue source lists live categories or brands and links straight into the matching shop filter, so it can never point at something you no longer stock.",
    fields: [
      {
        name: "columns",
        label: "Columns",
        type: "repeater",
        itemLabel: "column",
        titleField: "title",
        max: 5,
        fields: [
          { name: "title", label: "Column heading", type: "text" },
          {
            name: "source",
            label: "Fill from the catalogue",
            type: "select",
            options: FOOTER_SOURCE_OPTIONS,
          },
          {
            name: "links",
            label: "Links",
            type: "repeater",
            itemLabel: "link",
            titleField: "label",
            max: 8,
            fields: linkFields,
            defaultItem: { label: "New link", href: "/" },
          },
        ],
        defaultItem: { title: "New column", source: "", links: [] },
      },
    ],
    defaults: {
      columns: [
        {
          title: "Shop",
          // Filled from the Category table  no hand-written slugs to go stale.
          source: "categories",
          links: [],
        },
        {
          title: "Shop by wearer",
          source: "genders",
          links: [],
        },
        {
          title: "Browse",
          source: "",
          links: [
            { label: "All frames", href: shop() },
            { label: "On sale", href: shop("onSale=true") },
            { label: "Under Rs 4,900", href: shop("maxPrice=4900") },
            {
              label: "Newest first",
              href: shop("sortBy=createdAt&sortOrder=desc"),
            },
          ],
        },
        {
          title: "Help",
          source: "",
          links: [
            { label: "Contact us", href: "/contact" },
            { label: "Book an eye test", href: "/contact" },
            { label: "Delivery & returns", href: "/faq" },
            { label: "Track my order", href: "/my-account/orders" },
            { label: "How to measure your PD", href: "/faq" },
            { label: "FAQ", href: "/faq" },
          ],
        },
        {
          title: "Metro Opticals",
          source: "",
          links: [
            { label: "About us", href: "/contact" },
            { label: "Visit our store", href: "/contact" },
            { label: "Privacy policy", href: "/faq" },
            { label: "Terms & conditions", href: "/faq" },
          ],
        },
      ],
    },
  },
  {
    key: "footer.social",
    label: "Footer social links",
    group: "Footer",
    description: "Social icons in the footer.",
    fields: [
      {
        name: "items",
        label: "Profiles",
        type: "repeater",
        itemLabel: "profile",
        titleField: "platform",
        max: 6,
        fields: [
          {
            name: "platform",
            label: "Platform",
            type: "select",
            options: SOCIAL_OPTIONS,
          },
          { name: "href", label: "Profile URL", type: "link" },
        ],
        defaultItem: { platform: "facebook", href: "https://facebook.com" },
      },
    ],
    defaults: {
      items: [
        { platform: "facebook", href: "https://facebook.com" },
        { platform: "instagram", href: "https://instagram.com" },
        { platform: "tiktok", href: "https://tiktok.com" },
        { platform: "whatsapp", href: "https://wa.me/94770000000" },
      ],
    },
  },
];

export const BLOCK_MAP: Record<string, BlockDefinition> = BLOCKS.reduce(
  (acc, block) => {
    acc[block.key] = block;
    return acc;
  },
  {} as Record<string, BlockDefinition>,
);

export const BLOCK_GROUPS = ["Global", "Navigation", "Home", "Footer"] as const;

export const getBlockDefinition = (key: string) => BLOCK_MAP[key] ?? null;
