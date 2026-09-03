/**
 * Naming an order's customer and its lines.
 *
 * Since the counter started writing bills, neither is guaranteed to be there:
 * a walk-in customer has no storefront account, and a line can be a service
 * (an eye test, a lens fitting) that was never in the catalogue  or a product
 * that has since been removed from it. Every screen that prints a name goes
 * through here so a missing relation reads as the sale it was, not as "null".
 */

type NamedParty = { name?: string | null; email?: string | null } | null | undefined;

type NameableOrder = {
  user?: NamedParty;
  customer?: NamedParty;
  billingName?: string | null;
  billingEmail?: string | null;
};

type NameableItem = {
  title?: string | null;
  product?: { title?: string | null } | null;
};

export const WALK_IN_CUSTOMER = "Walk-in customer";

export function orderCustomerName(order: NameableOrder): string {
  return (
    order?.user?.name?.trim() ||
    order?.customer?.name?.trim() ||
    order?.billingName?.trim() ||
    WALK_IN_CUSTOMER
  );
}

export function orderCustomerEmail(order: NameableOrder): string {
  return (
    order?.user?.email?.trim() ||
    order?.customer?.email?.trim() ||
    order?.billingEmail?.trim() ||
    ""
  );
}

/** The line's own snapshot wins: a bill must reprint as it was sold. */
export function orderLineName(item: NameableItem): string {
  return item?.title?.trim() || item?.product?.title?.trim() || "Item";
}

/**
 * "Blue Cut (Grey) lenses" — what to print under the frame's name on a line
 * that was sold with lenses. Empty string when it was sold bare, so callers
 * can render it unconditionally.
 */
export function orderLineLensName(item: {
  lensName?: string | null;
  lensDesignName?: string | null;
  lensTintName?: string | null;
}): string {
  const name = item?.lensName?.trim();
  if (!name) return "";

  // The build belongs in the name. "Blue Cut" alone does not say whether the
  // customer bought a single vision pair or a progressive one, and those are
  // different glasses at very different prices.
  const design = item?.lensDesignName?.trim();
  const tint = item?.lensTintName?.trim();

  const parts = [name, design].filter(Boolean).join(" ");
  return tint ? `${parts} (${tint}) lenses` : `${parts} lenses`;
}
