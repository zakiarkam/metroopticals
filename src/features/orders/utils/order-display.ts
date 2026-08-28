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
