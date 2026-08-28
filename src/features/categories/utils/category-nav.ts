import type {
  NavItem,
  NavLink,
} from "@/features/site-content/components/site/MegaMenu";
import { getProductImageUrl } from "@/lib/storageUtils";

type NavCategory = {
  id?: number;
  name: string;
  slug: string;
  status?: string | null;
  children?: Array<{
    id?: number;
    name: string;
    slug: string;
    status?: string | null;
  }> | null;
};

/** Display order and labels for the "Suits" column  the product page's word. */
const SUITS: Array<{ value: string; label: string }> = [
  { value: "MEN", label: "Men" },
  { value: "WOMEN", label: "Women" },
  { value: "KIDS", label: "Kids" },
  { value: "UNISEX", label: "Unisex" },
];

/** The fields the panel card needs from an advertisement. */
export type MenuPanelAd = {
  slot: number;
  title: string;
  imageUrl?: string | null;
  link?: string | null;
  product?: { id: number; title: string; images?: string[] | null } | null;
};

const shop = (query = "") => `/shop-with-sidebar${query ? `?${query}` : ""}`;

const categoryHref = (slug: string, extra = "") =>
  shop(`categories=${encodeURIComponent(slug)}${extra ? `&${extra}` : ""}`);

/**
 * The header's category items, built from the catalogue itself.
 *
 * The shop's real categories lead the menu: add one in the admin and it
 * appears here already linked to the shop filtered by it  nothing to type
 * twice, nothing to drift. Each panel offers the cuts a shopper actually
 * asks for over a counter  what is new, what is cheap, what is on offer 
 * expressed as shop filters, so they always agree with the product list.
 */
export function buildCategoryNavItems(
  categories: NavCategory[],
  /**
   * "Menu  Category panel card" advertisements. Slot 1 belongs to the first
   * category in the header, slot 2 to the second, and so on  the same
   * slot-by-position rule every other ad zone on the site uses, run from the
   * same Advertisements screen. Several ads on one slot: the highest priority
   * (the list's order) wins.
   */
  menuAds: MenuPanelAd[] = [],
  /** Wearers stocked per category id  drives each panel's "Suits" column. */
  gendersByCategory: Map<number, Set<string>> = new Map(),
): NavItem[] {
  const adBySlot = new Map<number, MenuPanelAd>();
  for (const ad of menuAds) {
    if (!adBySlot.has(ad.slot)) adBySlot.set(ad.slot, ad);
  }

  return categories
    .filter((category) => (category.status ?? "active") === "active")
    .map((category, index) => {
      const ad = adBySlot.get(index + 1);
      // An ad drawn on the linked product's own photo, when no artwork was
      // uploaded  the same borrowing rule the home promo panel uses.
      const adImage =
        ad?.imageUrl || getProductImageUrl(ad?.product?.images?.[0]) || "";
      const children = (category.children ?? []).filter(
        (child) => (child.status ?? "active") === "active",
      );

      // A parent's panel speaks for its whole family: frames filed under
      // "Men" (a child) still count towards Eyeglasses' Suits column.
      const familyIds = [category.id, ...children.map((child) => child.id)].filter(
        (value): value is number => value != null,
      );
      const stocked = new Set(
        familyIds.flatMap((cid) =>
          Array.from(gendersByCategory.get(cid) ?? []),
        ),
      );
      const suits: NavLink[] = SUITS.filter((option) => stocked.has(option.value)).map(
        (option) => ({
          label: option.label,
          href: categoryHref(category.slug, `genders=${option.value}`),
        }),
      );

      const browse: NavLink[] = [
        {
          label: `All ${category.name.toLowerCase()}`,
          href: categoryHref(category.slug),
        },
        {
          label: "New arrivals",
          href: categoryHref(category.slug, "sortBy=createdAt"),
        },
        {
          label: "Budget picks",
          href: categoryHref(category.slug, "sortBy=price-asc"),
        },
        {
          label: "On offer",
          href: categoryHref(category.slug, "onSale=true"),
          accent: true,
        },
      ];

      return {
        label: category.name,
        href: categoryHref(category.slug),
        accent: false,
        badge: "",
        // The card is an advertisement, managed like every other ad zone.
        // No ad on this slot, no card  the panel is just the links.
        promoImage: ad ? adImage : "",
        promoTitle: ad?.title ?? "",
        promoCopy: "",
        promoCtaLabel: ad ? "Shop now" : "",
        promoCtaHref:
          ad?.link ||
          (ad?.product ? `/shop-details/${ad.product.id}` : "") ||
          categoryHref(category.slug),
        columns: [
          ...(children.length
            ? [
                {
                  title: "Collections",
                  source: "" as const,
                  links: children.map((child) => ({
                    label: child.name,
                    href: categoryHref(child.slug),
                  })),
                },
              ]
            : []),
          ...(suits.length
            ? [{ title: "Suits", source: "" as const, links: suits }]
            : []),
          { title: "Browse", source: "" as const, links: browse },
        ],
      };
    });
}

/**
 * Saved menu items that would double a category are dropped: the category
 * item is the linked, self-updating one, so a leftover hand-typed copy of
 * the same name must not sit beside it.
 */
export function withoutCategoryDuplicates(
  items: NavItem[],
  categories: NavCategory[],
): NavItem[] {
  const names = new Set(
    categories.map((category) => category.name.trim().toLowerCase()),
  );
  return items.filter(
    (item) => !names.has((item.label ?? "").trim().toLowerCase()),
  );
}
