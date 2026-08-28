import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type {
  StockAdjustInput,
  StockMovementQueryInput,
} from "@/features/pos/validators/pos";

/**
 * Stock in, corrections, and the ledger behind the count.
 *
 * `Product.stock` is a running number; on its own it can only ever say what
 * the count is now, never how it got there. Every change made here writes a
 * movement row alongside it, so a count that looks wrong can be traced to the
 * delivery, the sale or the recount that moved it  and a miscount can be
 * corrected without anyone having to guess the arithmetic.
 */

export async function adjustStock(input: StockAdjustInput, adminId: number) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, title: true, stock: true, status: true },
    });
    if (!product) throw new NotFoundError("Product not found");

    const delta =
      input.mode === "add"
        ? input.quantity
        : input.mode === "remove"
          ? -input.quantity
          : input.quantity - product.stock;

    if (delta === 0) {
      throw new ValidationError("That is already the stock on record");
    }
    if (product.stock + delta < 0) {
      throw new ValidationError(
        `Only ${product.stock} in stock, so ${input.quantity} cannot be removed`,
      );
    }

    // Guarded against the count moving while this was being typed. Taking
    // stock out only matches while there is enough of it, so two people
    // removing the last five at once cannot leave the shelf at minus five; a
    // recount only matches while the count is still what was counted, so a
    // sale that lands mid-recount is not silently erased.
    const moved =
      input.mode === "set"
        ? await tx.product.updateMany({
            where: { id: product.id, stock: product.stock },
            data: { stock: input.quantity },
          })
        : await tx.product.updateMany({
            where: {
              id: product.id,
              ...(delta < 0 ? { stock: { gte: -delta } } : {}),
            },
            data: { stock: { increment: delta } },
          });

    if (moved.count === 0) {
      throw new ValidationError(
        "The stock changed while you were entering this. Check the count and try again.",
      );
    }

    const updated = await tx.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { id: true, title: true, sku: true, stock: true, status: true },
    });

    // Keep the storefront's badge honest in both directions.
    if (updated.stock <= 0 && updated.status === "ACTIVE") {
      await tx.product.update({
        where: { id: product.id },
        data: { status: "OUT_OF_STOCK" },
      });
    } else if (updated.stock > 0 && updated.status === "OUT_OF_STOCK") {
      await tx.product.update({
        where: { id: product.id },
        data: { status: "ACTIVE" },
      });
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        delta,
        // The route's validator defaults this, but the service is callable
        // from anywhere and a movement with no reason is exactly the row the
        // ledger exists to prevent.
        reason: input.reason ?? "ADJUSTMENT",
        note:
          input.note ||
          (input.mode === "set" ? `Counted ${input.quantity} on the shelf` : null),
        createdById: adminId,
      },
    });

    return { movement, product: updated };
  }, { timeout: 20_000, maxWait: 10_000 });
}

export async function getStockMovements(query: StockMovementQueryInput) {
  const { page, limit } = query;
  const search = query.search?.trim();

  const where: Prisma.StockMovementWhereInput = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
    ...(search
      ? {
          OR: [
            { product: { title: { contains: search, mode: "insensitive" } } },
            { product: { sku: { contains: search, mode: "insensitive" } } },
            { order: { orderNumber: { contains: search, mode: "insensitive" } } },
            { note: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, title: true, sku: true, stock: true } },
        order: { select: { id: true, orderNumber: true, channel: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/** What is about to run out, worst first. */
export async function getLowStock(threshold = 10, take = 20) {
  const products = await prisma.product.findMany({
    where: { status: { not: "INACTIVE" }, stock: { lte: threshold } },
    select: {
      id: true,
      title: true,
      sku: true,
      stock: true,
      status: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: [{ stock: "asc" }, { title: "asc" }],
    take,
  });

  return { products, threshold };
}
