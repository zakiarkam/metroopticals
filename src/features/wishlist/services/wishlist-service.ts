import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'

export async function getWishlistItems(userId: number) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function addToWishlist(userId: number, productId: number) {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  })

  if (!product) {
    throw new NotFoundError('Product not found')
  }

  // Check if already in wishlist
  const existingItem = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  })

  if (existingItem) {
    throw new ValidationError('Product already in wishlist')
  }

  return prisma.wishlistItem.create({
    data: {
      userId,
      productId,
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  })
}

export async function removeFromWishlist(userId: number, itemId: number) {
  const wishlistItem = await prisma.wishlistItem.findUnique({
    where: { id: itemId },
  })

  if (!wishlistItem || wishlistItem.userId !== userId) {
    throw new NotFoundError('Wishlist item not found')
  }

  await prisma.wishlistItem.delete({
    where: { id: itemId },
  })
}

export async function clearWishlist(userId: number) {
  await prisma.wishlistItem.deleteMany({
    where: { userId },
  })
}


