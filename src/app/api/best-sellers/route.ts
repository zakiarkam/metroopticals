import { handleError, createSuccessResponse } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { logger, serializeError } from "@/lib/logger";

export async function GET() {
  try {
    // Optimized query: get top 6 products by sales
    const topProductsGrouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 6,
    });

    const productIds = topProductsGrouped.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "ACTIVE",
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topProductsGrouped
      .map((item) => {
        const product = productMap.get(item.productId);
        return product
          ? {
              id: product.id,
              name: product.title,
              category: product.category?.name,
              sold: item._count.id,
              price: product.price,
              discountedPrice: product.discountedPrice,
              images: product.images || [],
              stock: product.stock,
              description: product.description,
              status: product.status,
            }
          : null;
      })
      .filter((item) => item !== null);

    return createSuccessResponse({
      topProducts,
    });
  } catch (error) {
    logger.error("Best Sellers API Error", serializeError(error));
    return handleError(error);
  }
}
