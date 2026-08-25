import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  AddToCartInput,
  UpdateCartItemInput,
} from "@/features/cart/validators/cart";

export async function getCartItems(userId: number) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCartItem(userId: number, itemId: number) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
  }

  return cartItem;
}

/**
 * Settle which colourway a cart line is for.
 *
 * The chosen colour has to be one the product actually lists, otherwise a
 * hand-rolled request could put anything on a picking slip. A product with
 * colours that is quick-added from a listing card (no choice made) falls back
 * to the first listed colour rather than an empty one, so the warehouse always
 * has something to pick and the shopper can see what was assumed.
 */
function resolveColor(
  requested: string | undefined,
  frameColors: string[]
): string {
  const options = (frameColors ?? []).map((value) => value.trim()).filter(Boolean);
  if (!options.length) return "";

  const wanted = requested?.trim();
  if (!wanted) return options[0];

  const match = options.find(
    (option) => option.toLowerCase() === wanted.toLowerCase()
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
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const color = resolveColor(data.color, product.frameColors);

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

  if (existingItem) {
    // Update quantity
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
  data: UpdateCartItemInput
) {
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: { select: { frameColors: true } } },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
  }

  // Changing the colour of a line already in the cart can collide with a line
  // that colour already has. Merging is the only sensible outcome — two rows
  // for "Tortoise" would break the unique index and confuse the shopper.
  if (data.color !== undefined) {
    const color = resolveColor(data.color, cartItem.product.frameColors);

    if (color !== cartItem.color) {
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
