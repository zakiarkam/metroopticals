import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
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

export async function addToCart(userId: number, data: AddToCartInput) {
  const { productId, quantity } = data;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  // Check if item already in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
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
  });

  if (!cartItem || cartItem.userId !== userId) {
    throw new NotFoundError("Cart item not found");
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
