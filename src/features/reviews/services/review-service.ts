import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  CreateReviewInput,
  ReviewQueryInput,
} from "@/features/reviews/validators/review";
import type { Review, ReviewSummary } from "@/features/reviews/types/review";

const authorSelect = { id: true, name: true };

const serialise = (row: any): Review => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export async function recalculateProductRating(productId: number) {
  const aggregate = await prisma.review.aggregate({
    where: { productId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const count = aggregate._count._all;

  await prisma.product.update({
    where: { id: productId },
    data: {
      // Rounded to one decimal: the UI shows "4.3", and storing full float
      // precision would make two products with identical stars sort apart.
      rating: count ? Math.round((aggregate._avg.rating ?? 0) * 10) / 10 : null,
      reviewCount: count,
    },
  });
}

/** Has this customer received this product in a delivered order? */
async function hasPurchased(userId: number, productId: number) {
  const order = await prisma.order.findFirst({
    where: {
      userId,
      status: "DELIVERED",
      items: { some: { productId } },
    },
    select: { id: true },
  });

  return Boolean(order);
}

export async function getProductReviews(
  productId: number,
  query: { page?: number; limit?: number },
  viewerId?: number | null,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const where = { productId, status: "PUBLISHED" as const };

  const [rows, total, grouped, mine] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: authorSelect } },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({
      by: ["rating"],
      where,
      _count: { _all: true },
    }),
    viewerId
      ? prisma.review.findUnique({
          where: { userId_productId: { userId: viewerId, productId } },
          include: { user: { select: authorSelect } },
        })
      : null,
  ]);

  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  } as ReviewSummary["distribution"];
  let weighted = 0;

  for (const row of grouped) {
    const stars = row.rating as 1 | 2 | 3 | 4 | 5;
    distribution[stars] = row._count._all;
    weighted += stars * row._count._all;
  }

  const summary: ReviewSummary = {
    average: total ? Math.round((weighted / total) * 10) / 10 : null,
    total,
    distribution,
  };

  return {
    reviews: rows.map(serialise),
    summary,
    mine: mine ? serialise(mine) : null,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function upsertReview(
  userId: number,
  productId: number,
  data: CreateReviewInput,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  const verifiedPurchase = await hasPurchased(userId, productId);

  const row = await prisma.review.upsert({
    where: { userId_productId: { userId, productId } },
    create: {
      userId,
      productId,
      rating: data.rating,
      title: data.title?.trim() || null,
      body: data.body.trim(),
      verifiedPurchase,
      status: "PENDING",
    },
    update: {
      rating: data.rating,
      title: data.title?.trim() || null,
      body: data.body.trim(),
      verifiedPurchase,
      status: "PENDING",
    },
    include: { user: { select: authorSelect } },
  });

  await recalculateProductRating(productId);

  return serialise(row);
}

export async function deleteOwnReview(userId: number, productId: number) {
  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Review not found");

  await prisma.review.delete({ where: { id: existing.id } });
  await recalculateProductRating(productId);
}

/* ------------------------------------------------------------------ admin */

export async function getReviews(query: ReviewQueryInput) {
  const { page, limit, status, productId, search, rating } = query;

  const where: any = {};
  if (status) where.status = status;
  if (productId) where.productId = productId;
  if (rating) where.rating = rating;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
      { product: { title: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [rows, total, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: authorSelect },
        product: { select: { id: true, title: true, images: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  return {
    reviews: rows.map(serialise),
    pendingCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function setReviewStatus(
  id: number,
  status: "PENDING" | "PUBLISHED" | "REJECTED",
) {
  const existing = await prisma.review.findUnique({
    where: { id },
    select: { productId: true },
  });
  if (!existing) throw new NotFoundError("Review not found");

  const row = await prisma.review.update({
    where: { id },
    data: { status },
    include: {
      user: { select: authorSelect },
      product: { select: { id: true, title: true, images: true } },
    },
  });

  await recalculateProductRating(existing.productId);

  return serialise(row);
}

export async function deleteReview(id: number) {
  const existing = await prisma.review.findUnique({
    where: { id },
    select: { productId: true },
  });
  if (!existing) throw new NotFoundError("Review not found");

  await prisma.review.delete({ where: { id } });
  await recalculateProductRating(existing.productId);
}

export async function getFeaturedReviews(limit = 5) {
  const rows = await prisma.review.findMany({
    where: { status: "PUBLISHED", rating: { gte: 4 } },
    include: {
      user: { select: authorSelect },
      product: { select: { id: true, title: true, images: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

  return rows.map(serialise);
}
