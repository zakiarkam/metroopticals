import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getEffectiveStock } from "@/features/products/utils/availability";
import type { ColorStock } from "@/features/products/utils/availability";
import type {
  AddToCartInput,
  SetCartItemLensInput,
  UpdateCartItemInput,
} from "@/features/cart/validators/cart";
import { quoteLensType } from "@/features/lenses/services/lens-service";

/** Per-colour counts ride along so every ceiling is the colour's, not the total's. */
const colorStocksInclude = {
  select: { color: true, stock: true },
  orderBy: { id: "asc" },
} as const;

/**
 * What a cart line needs to say about its lenses. Names come from the live
 * rows here rather than from a copy, because a basket is a live thing: a lens
 * renamed in the admin should read correctly in the cart the same minute.
 */
const lensInclude = {
  lensType: {
    select: { id: true, name: true, slug: true, isActive: true },
  },
  lensTint: { select: { id: true, name: true, hex: true, surcharge: true } },
  prescription: {
    select: {
      id: true,
      label: true,
      version: true,
      rightSph: true,
      rightCyl: true,
      rightAxis: true,
      rightAdd: true,
      rightPrism: true,
      rightBase: true,
      leftSph: true,
      leftCyl: true,
      leftAxis: true,
      leftAdd: true,
      leftPrism: true,
      leftBase: true,
      pdSingle: true,
      pdRight: true,
      pdLeft: true,
    },
  },
} as const;

export async function getCartItems(userId: number) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true,
          colorStocks: colorStocksInclude,
        },
      },
      ...lensInclude,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * What tells two lines of the same frame and colour apart.
 *
 * A bare frame signs as the empty string, which is what every row already in
 * the table carries - so repeat adds of a plain frame still collapse into one
 * line exactly as they did before lenses existed.
 */
export function lensSignature(selection: {
  lensTypeId?: number | null;
  lensDesignKind?: string | null;
  lensTintId?: number | null;
  prescriptionId?: number | null;
}): string {
  if (!selection.lensTypeId) return "";
  return [
    `t${selection.lensTypeId}`,
    // How it is made is part of what tells two lines apart: the same frame
    // ordered once as single vision and once as a progressive is two pairs of
    // glasses, not one line of quantity two.
    `d${selection.lensDesignKind ?? "SINGLE_VISION"}`,
    selection.lensTintId ? `c${selection.lensTintId}` : "c0",
    selection.prescriptionId ? `p${selection.prescriptionId}` : "p0",
  ].join("|");
}

/**
 * What the shelf can actually cover for one line: the colourway's count when
 * one is recorded, the product total otherwise. The error names the colour so
 * "out of stock" on a two-colour frame is not read as the frame being gone.
 */
function assertLineWithinStock(
  product: { stock: number; colorStocks: ColorStock[] },
  color: string,
  quantity: number,
) {
  const ceiling = getEffectiveStock(product.stock, product.colorStocks, color);
  if (quantity <= ceiling) return;

  if (ceiling <= 0) {
    throw new ValidationError(
      color ? `The ${color} colour is out of stock` : "Out of stock",
    );
  }
  throw new ValidationError(
    color
      ? `Only ${ceiling} of the ${color} colour in stock`
      : `Only ${ceiling} in stock`,
  );
}

function resolveColor(
  requested: string | undefined,
  frameColors: string[],
): string {
  const options = (frameColors ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  if (!options.length) return "";

  const wanted = requested?.trim();
  if (!wanted) return options[0];

  const match = options.find(
    (option) => option.toLowerCase() === wanted.toLowerCase(),
  );

  if (!match) {
    throw new ValidationError(`"${wanted}" is not a colour of this product`, [
      { path: "color", message: "Pick one of the listed colours" },
    ]);
  }

  return match;
}

export async function addToCart(userId: number, data: AddToCartInput) {
  const { productId, quantity } = data;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { colorStocks: colorStocksInclude },
  });

  if (!product || product.status !== "ACTIVE") {
    throw new NotFoundError("Product not found");
  }

  let color = resolveColor(data.color, product.frameColors);

  // No colour asked for: don't default onto a colourway that is sold out
  // while another is on the shelf.
  if (!data.color?.trim() && color) {
    const buyable = product.frameColors
      .map((option) => option.trim())
      .filter(Boolean)
      .find(
        (option) =>
          getEffectiveStock(product.stock, product.colorStocks, option) > 0,
      );
    if (buyable) color = buyable;
  }

  // Already in the cart in this colour? Two colourways of the same frame are
  // two lines, so the lookup is keyed on the colour as well as the product.
  // A frame is always added bare; lenses are fitted afterwards from the cart,
  // so a new line always signs as the empty string.
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId_color_lensSignature: {
        userId,
        productId,
        color,
        lensSignature: "",
      },
    },
  });

  assertLineWithinStock(
    product,
    color,
    (existingItem?.quantity ?? 0) + quantity,
  );

  if (existingItem) {
    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  // Create new cart item
  return prisma.cartItem.create({
    data: {
      userId,
      productId,
      quantity,
      color,
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  });
}

export async function updateCartItem(
  userId: number,
  itemId: number,
  data: UpdateCartItemInput,
) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      product: {
        select: {
          frameColors: true,
          stock: true,
          colorStocks: colorStocksInclude,
        },
      },
    },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
  }

  // The same ceiling `addToCart` enforces. Without it the quantity stepper is
  // a way round the stock check: a line can be raised to twenty of something
  // there are two of, and the shortage is only discovered at checkout.
  assertLineWithinStock(cartItem.product, cartItem.color, data.quantity);

  if (data.color !== undefined) {
    const color = resolveColor(data.color, cartItem.product.frameColors);

    if (color !== cartItem.color) {
      // The line is moving onto another colourway, whose own count is the
      // ceiling that matters now.
      assertLineWithinStock(cartItem.product, color, data.quantity);

      const clash = await prisma.cartItem.findUnique({
        where: {
          userId_productId_color_lensSignature: {
            userId,
            productId: cartItem.productId,
            color,
            lensSignature: cartItem.lensSignature,
          },
        },
      });

      if (clash) {
        // Two lines becoming one: the merged quantity is what will be picked,
        // so it is the number the shelf has to cover.
        assertLineWithinStock(
          cartItem.product,
          color,
          clash.quantity + data.quantity,
        );
        await prisma.cartItem.delete({ where: { id: itemId } });
        return prisma.cartItem.update({
          where: { id: clash.id },
          data: { quantity: clash.quantity + data.quantity },
          include: { product: { include: { category: true } } },
        });
      }

      return prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: data.quantity, color },
        include: { product: { include: { category: true } } },
      });
    }
  }

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: data.quantity },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  });
}

export async function removeCartItem(userId: number, itemId: number) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });
}

export async function clearCart(userId: number) {
  await prisma.cartItem.deleteMany({
    where: { userId },
  });
}

export async function removeFromCart(userId: number, itemId: number) {
  return removeCartItem(userId, itemId);
}

/**
 * Fit lenses to a line already in the basket, or take them off again.
 *
 * The price is re-quoted here from the live price list rather than taken from
 * the request. That is the whole security of it: the picker's figure is a
 * preview, this is the one that gets charged, and the two agree because they
 * run the same `quoteLens`.
 *
 * Fitting lenses changes what the line *is*, so it may collide with another
 * line of the same frame, colour and lens choice - two identical pairs are one
 * line of quantity two, not two lines.
 */
export async function setCartItemLens(
  userId: number,
  itemId: number,
  data: SetCartItemLensInput,
) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      userId: true,
      productId: true,
      color: true,
      quantity: true,
    },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
  }

  // Taking the lenses off: back to a bare frame at zero lens price.
  if (!data.lensTypeId) {
    return applyLensSelection(userId, cartItem, {
      lensTypeId: null,
      lensDesignKind: null,
      lensTintId: null,
      prescriptionId: null,
      lensPrice: 0,
      lensIsOrderLens: false,
      lensLeadTimeDays: null,
    });
  }

  const quote = await quoteLensType(userId, {
    lensTypeId: data.lensTypeId,
    lensDesignKind: data.lensDesignKind,
    lensTintId: data.lensTintId ?? null,
    prescriptionId: data.prescriptionId ?? null,
  });

  // A prescription outside the priced range is a real answer, not a failure -
  // but it is not something that can be put in a basket and paid for.
  if (!quote.priced) {
    throw new ValidationError(
      quote.reason ?? "We can't price that lens for this prescription",
    );
  }

  return applyLensSelection(userId, cartItem, {
    lensTypeId: data.lensTypeId,
    lensDesignKind: quote.designKind,
    lensTintId: data.lensTintId ?? null,
    prescriptionId: data.prescriptionId ?? null,
    lensPrice: quote.total,
    // Copied off the quote so the basket can say "made to order" without
    // re-pricing the line to find out.
    lensIsOrderLens: quote.isOrderLens,
    lensLeadTimeDays: quote.leadTimeDays,
  });
}

/** Write the choice onto the line, merging into an identical line if one exists. */
async function applyLensSelection(
  userId: number,
  cartItem: { id: number; productId: number; color: string; quantity: number },
  selection: {
    lensTypeId: number | null;
    lensDesignKind: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
    lensTintId: number | null;
    prescriptionId: number | null;
    lensPrice: number;
    lensIsOrderLens: boolean;
    lensLeadTimeDays: number | null;
  },
) {
  const signature = lensSignature(selection);

  const twin = await prisma.cartItem.findUnique({
    where: {
      userId_productId_color_lensSignature: {
        userId,
        productId: cartItem.productId,
        color: cartItem.color,
        lensSignature: signature,
      },
    },
    select: { id: true, quantity: true },
  });

  if (twin && twin.id !== cartItem.id) {
    const merged = twin.quantity + cartItem.quantity;

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: cartItem.productId },
      select: { stock: true, colorStocks: colorStocksInclude },
    });
    assertLineWithinStock(product, cartItem.color, merged);

    await prisma.cartItem.delete({ where: { id: cartItem.id } });

    return prisma.cartItem.update({
      where: { id: twin.id },
      data: { quantity: merged, ...selection, lensSignature: signature },
      include: { product: { include: { category: true } }, ...lensInclude },
    });
  }

  return prisma.cartItem.update({
    where: { id: cartItem.id },
    data: { ...selection, lensSignature: signature },
    include: { product: { include: { category: true } }, ...lensInclude },
  });
}

/**
 * Re-price every lens in the basket against today's price list.
 *
 * Run at checkout. A basket can sit for weeks while the shop edits what it
 * charges, and the customer must pay what is on the price list now - so this
 * returns the lines whose price moved, for the checkout to show before
 * anything is taken.
 */
export async function repriceCartLenses(userId: number) {
  const lines = await prisma.cartItem.findMany({
    where: { userId, NOT: { lensTypeId: null } },
    select: {
      id: true,
      lensTypeId: true,
      lensDesignKind: true,
      lensTintId: true,
      prescriptionId: true,
      lensPrice: true,
      lensIsOrderLens: true,
      lensLeadTimeDays: true,
      product: { select: { title: true } },
    },
  });

  const changed: Array<{
    id: number;
    title: string;
    from: number;
    to: number | null;
    reason: string | null;
  }> = [];

  for (const line of lines) {
    if (!line.lensTypeId) continue;

    let quote;
    try {
      quote = await quoteLensType(userId, {
        lensTypeId: line.lensTypeId,
        lensDesignKind: line.lensDesignKind ?? "SINGLE_VISION",
        lensTintId: line.lensTintId,
        prescriptionId: line.prescriptionId,
      });
    } catch {
      // The lens was retired, or the prescription was removed. Either way the
      // line can no longer be sold with lenses on it.
      changed.push({
        id: line.id,
        title: line.product.title,
        from: line.lensPrice,
        to: null,
        reason: "That lens is no longer available",
      });
      continue;
    }

    if (!quote.priced) {
      changed.push({
        id: line.id,
        title: line.product.title,
        from: line.lensPrice,
        to: null,
        reason: quote.reason,
      });
      continue;
    }

    // The lead time can move without the price moving - a power the shop
    // used to cut in-house becomes an ordered lens - so the flags are
    // re-saved on their own, quietly, with no basket warning attached.
    if (
      quote.isOrderLens !== line.lensIsOrderLens ||
      (quote.leadTimeDays ?? null) !== line.lensLeadTimeDays
    ) {
      await prisma.cartItem.update({
        where: { id: line.id },
        data: {
          lensIsOrderLens: quote.isOrderLens,
          lensLeadTimeDays: quote.leadTimeDays,
        },
      });
    }

    if (Math.abs(quote.total - line.lensPrice) > 0.005) {
      await prisma.cartItem.update({
        where: { id: line.id },
        data: { lensPrice: quote.total },
      });
      changed.push({
        id: line.id,
        title: line.product.title,
        from: line.lensPrice,
        to: quote.total,
        reason: "The lens price has changed since you added it",
      });
    }
  }

  return changed;
}
