import { redirect } from "next/navigation";

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
