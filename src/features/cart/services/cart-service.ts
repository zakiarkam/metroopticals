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
  });

  if (!product || product.status !== "ACTIVE") {
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

  if ((existingItem?.quantity ?? 0) + quantity > product.stock) {
    throw new ValidationError(`Only ${product.stock} in stock`);
  }

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
    include: { product: { select: { frameColors: true } } },
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
  }

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
