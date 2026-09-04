import { ValidationError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

/**
 * Per-colour bookkeeping, shared by every path that moves stock.
 *
 * `Product.stock` stays the authoritative total - the guarded decrements on
 * it are what stop overselling - and these helpers keep the per-colour rows
 * beside it in step. A colour whose row has a NULL count (or no row at all)
 * is uncounted: it falls back to the total, every mover here leaves it
 * alone, and the product behaves exactly as it did before per-colour stock
 * existed. A row can therefore exist purely to carry the colour's photo.
 */

type Tx = Prisma.TransactionClient;

/** Colour names are free text entered by the admin, so match loosely. */
const canonical = (value: string) => value.trim().toLowerCase();

async function findColorRow(tx: Tx, productId: number, color: string) {
  const key = canonical(color);
  if (!key) return null;
  const rows = await tx.productColorStock.findMany({ where: { productId } });
  return rows.find((row) => canonical(row.color) === key) ?? null;
}

/**
 * Take units of one colourway off the shelf, inside a sale transaction.
 *
 * `strict` fails the sale when the colour's count cannot cover it - the
 * website and the POS both use it, so a stale screen can never sell a
 * colourway past its count; the cashier's escape hatch for a shelf that
 * disagrees with the book is adding the line without a colour. Non-strict
 * callers (none today) would clamp the count at zero instead.
 */
export async function takeColorStock(
  tx: Tx,
  input: {
    productId: number;
    color: string | null | undefined;
    quantity: number;
    strict: boolean;
  },
) {
  if (!input.color?.trim() || input.quantity <= 0) return;

  const row = await findColorRow(tx, input.productId, input.color);
  if (!row || row.stock == null) return;

  const taken = await tx.productColorStock.updateMany({
    where: { id: row.id, stock: { gte: input.quantity } },
    data: { stock: { decrement: input.quantity } },
  });

  if (taken.count === 0) {
    if (input.strict) {
      throw new ValidationError(
        `The ${row.color} colour has just sold out - pick another colour`,
      );
    }
    await tx.productColorStock.update({
      where: { id: row.id },
      data: { stock: 0 },
    });
  }
}

/** Put units of one colourway back - a void, a return, a cancelled order. */
export async function returnColorStock(
  tx: Tx,
  input: {
    productId: number;
    color: string | null | undefined;
    quantity: number;
  },
) {
  if (!input.color?.trim() || input.quantity <= 0) return;

  const row = await findColorRow(tx, input.productId, input.color);
  if (!row || row.stock == null) return;

  await tx.productColorStock.update({
    where: { id: row.id },
    data: { stock: { increment: input.quantity } },
  });
}

export type ColorStockEntry = {
  color: string;
  /** NULL/absent keeps the colour uncounted; it falls back to the total. */
  stock?: number | null;
  /** One of the product's gallery images, or null for no colour photo. */
  image?: string | null;
};

/**
 * Make the rows agree with the product form: one row per submitted colour,
 * rows for dropped colours deleted, photo tags kept to images the gallery
 * actually holds. Returns the summed total when every colour is counted,
 * and null while any colour is not - a partial sum would understate the
 * shelf, so the total is only derived when it can be derived honestly.
 */
export async function syncColorStocks(
  tx: Tx,
  productId: number,
  frameColors: string[],
  colorStocks: ColorStockEntry[],
  images: string[],
) {
  const allowed = new Map(frameColors.map((c) => [canonical(c), c.trim()]));
  const gallery = new Set(images.filter(Boolean));

  const wanted = new Map<
    string,
    { color: string; stock: number | null; image: string | null }
  >();
  for (const entry of colorStocks) {
    const key = canonical(entry.color);
    if (!allowed.has(key)) {
      throw new ValidationError(
        `"${entry.color}" is not one of this product's colours`,
      );
    }
    // A tag pointing at a photo the gallery no longer holds would never
    // render; it is dropped rather than stored.
    const image = entry.image && gallery.has(entry.image) ? entry.image : null;
    const stock = entry.stock ?? null;

    // Repeated colours collapse onto one row rather than racing the unique
    // index; counts add up, the last photo wins, and the casing follows the
    // colour list.
    const existing = wanted.get(key);
    wanted.set(key, {
      color: allowed.get(key)!,
      stock:
        existing === undefined
          ? stock
          : existing.stock == null && stock == null
            ? null
            : (existing.stock ?? 0) + (stock ?? 0),
      image: image ?? existing?.image ?? null,
    });
  }

  const existingRows = await tx.productColorStock.findMany({
    where: { productId },
  });

  for (const row of existingRows) {
    const entry = wanted.get(canonical(row.color));
    if (!entry) {
      await tx.productColorStock.delete({ where: { id: row.id } });
    } else if (
      entry.stock !== row.stock ||
      entry.color !== row.color ||
      entry.image !== row.image
    ) {
      await tx.productColorStock.update({
        where: { id: row.id },
        data: { color: entry.color, stock: entry.stock, image: entry.image },
      });
    }
  }

  const existingKeys = new Set(existingRows.map((row) => canonical(row.color)));
  for (const [key, entry] of wanted) {
    if (!existingKeys.has(key)) {
      await tx.productColorStock.create({
        data: {
          productId,
          color: entry.color,
          stock: entry.stock,
          image: entry.image,
        },
      });
    }
  }

  if (wanted.size === 0) return null;

  let total = 0;
  for (const entry of wanted.values()) {
    if (entry.stock == null) return null;
    total += entry.stock;
  }
  return total;
}

/**
 * Drop the rows for colours the product no longer lists. Used when the
 * product form changes `frameColors` without sending per-colour rows.
 */
export async function pruneColorStocks(
  tx: Tx,
  productId: number,
  frameColors: string[],
) {
  const allowed = new Set(frameColors.map(canonical));
  const rows = await tx.productColorStock.findMany({ where: { productId } });
  const orphaned = rows.filter((row) => !allowed.has(canonical(row.color)));
  if (orphaned.length) {
    await tx.productColorStock.deleteMany({
      where: { id: { in: orphaned.map((row) => row.id) } },
    });
  }
}
