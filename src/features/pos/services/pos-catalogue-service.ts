import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { PosProductQueryInput } from "@/features/pos/validators/pos";

/**
 * Product lookup for the counter.
 *
 * Different from the storefront search in three ways that matter when someone
 * is waiting at the till: it searches the shop's own codes as well as the
 * name, it returns stock so the cashier can see what is left, and an exact
 * barcode or SKU match short-circuits everything else so a scan adds the right
 * line instead of offering a page of near-misses.
 */

const posProductSelect = {
  id: true,
  title: true,
  slug: true,
  sku: true,
  barcode: true,
  price: true,
  discountedPrice: true,
  stock: true,
  status: true,
  images: true,
  unitType: true,
  frameColors: true,
  // Per-colour counts, so the colour dialog can tell the cashier which
  // colourway is running out before they go looking for it.
  colorStocks: { select: { color: true, stock: true } },
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

export type PosProduct = Prisma.ProductGetPayload<{ select: typeof posProductSelect }>;

export async function searchPosProducts(query: PosProductQueryInput) {
  const search = query.search?.trim();

  const baseWhere: Prisma.ProductWhereInput = {
    status: { not: "INACTIVE" },
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.brandId ? { brandId: query.brandId } : {}),
    ...(query.inStockOnly ? { stock: { gt: 0 } } : {}),
  };

  if (search) {
    // A scanner types the code and presses Enter, so an exact code match is
    // treated as "this one" and returned on its own.
    const exact = await prisma.product.findFirst({
      where: {
        OR: [{ barcode: search }, { sku: search }],
      },
      select: posProductSelect,
    });
    if (exact) return { products: [exact], scanned: true };
  }

  const products = await prisma.product.findMany({
    where: search
      ? {
          ...baseWhere,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
            { brand: { is: { name: { contains: search, mode: "insensitive" } } } },
            { category: { is: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : baseWhere,
    select: posProductSelect,
    // In stock first: what the cashier can actually sell right now is what
    // should be under their thumb.
    orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
    take: query.limit,
  });

  return { products, scanned: false };
}

/** Categories and brands that have something sellable behind them. */
export async function getPosFilters() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { status: "active", products: { some: {} } },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      where: { status: "active", products: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { categories, brands };
}
