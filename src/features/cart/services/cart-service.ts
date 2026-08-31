import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getEffectiveStock } from "@/features/products/utils/availability";
import type { ColorStock } from "@/features/products/utils/availability";
import type {
  AddToCartInput,
  UpdateCartItemInput,
} from "@/features/cart/validators/cart";

/** Per-colour counts ride along so every ceiling is the colour's, not the total's. */
const colorStocksInclude = {
  select: { color: true, stock: true },
  orderBy: { id: "asc" },
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
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
    color ? `Only ${ceiling} of the ${color} colour in stock` : `Only ${ceiling} in stock`,
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
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId_color: {
        userId,
        productId,
        color,
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
          userId_productId_color: {
            userId,
            productId: cartItem.productId,
            color,
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
