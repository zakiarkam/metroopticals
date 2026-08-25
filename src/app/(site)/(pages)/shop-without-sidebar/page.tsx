import { redirect } from "next/navigation";

/**
 * Retired route.
 *
 * `/shop-without-sidebar` was a second, near-identical shop  same hero, same
 * toolbar, same grid  but with a brands-only filter panel, its own drawer
 * behaviour and its own set of bugs. Nothing distinguished the two pages to a
 * shopper, so this one now forwards to the real shop with its query intact.
 */
export default async function ShopWithoutSidebarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value != null) query.set(key, value);
  });

  const qs = query.toString();
  redirect(`/shop-with-sidebar${qs ? `?${qs}` : ""}`);
}
