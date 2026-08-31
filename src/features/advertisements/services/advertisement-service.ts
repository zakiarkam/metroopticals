import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import type {
  CreateAdvertisementInput,
  UpdateAdvertisementInput,
  AdvertisementQueryInput,
} from "@/features/advertisements/validators/advertisement";
import type {
  Advertisement,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";
import { AD_PLACEMENTS } from "@/features/advertisements/constants/advertisement";

const advertisementProductSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  discountedPrice: true,
  images: true,
  status: true,
};

export async function getAdvertisements(query: AdvertisementQueryInput) {
  const { page = 1, limit = 10, search, status, placement } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (placement) {
    where.placement = placement;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { link: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.advertisement.findMany({
      where,
      include: {
        product: {
          select: advertisementProductSelect,
        },
      },
      skip,
      take: limit,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.advertisement.count({ where }),
  ]);

  return {
    advertisements: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAdvertisementById(id: number) {
  const advertisement = await prisma.advertisement.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
        },
      },
    },
  });

  if (!advertisement) {
    throw new NotFoundError("Advertisement not found");
  }

  return advertisement;
}

async function resolveAdvertisementTitle(
  title: string | null | undefined,
  placement: AdvertisementPlacement,
  productId?: number | null,
) {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { title: true },
    });
    if (product?.title) return product.title;
  }

  return AD_PLACEMENTS[placement]?.label ?? "Advertisement";
}

export async function createAdvertisement(data: CreateAdvertisementInput) {
  const title = await resolveAdvertisementTitle(
    data.title,
    data.placement,
    data.productId,
  );

  return prisma.advertisement.create({
    data: {
      title,
      imageUrl: data.imageUrl?.trim() || null,
      link: data.link || null,
      placement: data.placement,
      status: data.status || "active",
      priority: data.priority || 0,
      slot: data.slot || 1,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      // Banner placements carry no product, so this is nullable.
      productId: data.productId ?? null,
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
        },
      },
    },
  });
}

export async function updateAdvertisement(
  id: number,
  data: UpdateAdvertisementInput,
) {
  const advertisement = await getAdvertisementById(id);

  // Clearing the title is allowed; it just falls back the same way a blank one
  // did at creation rather than leaving the row nameless.
  const title =
    data.title === undefined
      ? undefined
      : await resolveAdvertisementTitle(
          data.title,
          (data.placement ?? advertisement.placement) as AdvertisementPlacement,
          data.productId ?? advertisement.productId,
        );

  return prisma.advertisement.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      // An empty string means "remove the artwork", which a product placement
      // is allowed to do  it then runs on the product's own photo.
      ...(data.imageUrl !== undefined && {
        imageUrl: data.imageUrl?.trim() || null,
      }),
      ...(data.link !== undefined && { link: data.link || null }),
      ...(data.placement && { placement: data.placement }),
      ...(data.status && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.slot !== undefined && { slot: data.slot }),
      ...(data.startDate !== undefined && {
        startDate: data.startDate ? new Date(data.startDate) : null,
      }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.productId !== undefined && {
        productId: data.productId || null,
      }),
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
        },
      },
    },
  });
}

export async function updateAdvertisementStatus(
  id: number,
  status: "active" | "inactive",
) {
  const advertisement = await getAdvertisementById(id);

  return prisma.advertisement.update({
    where: { id },
    data: { status },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
        },
      },
    },
  });
}

export async function deleteAdvertisement(id: number) {
  const advertisement = await getAdvertisementById(id);

  await prisma.advertisement.delete({
    where: { id },
  });
}

const buildActiveAdvertisementWhere = (
  placement?: AdvertisementPlacement,
): Prisma.AdvertisementWhereInput => {
  const now = new Date();
  const where: any = {
    status: "active",
    AND: [
      {
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      {
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    ],
  };

  if (placement) {
    where.placement = placement;
  }

  return where;
};

export async function getActiveAdvertisementsByPlacement(
  placement: AdvertisementPlacement,
  limit?: number,
): Promise<Advertisement[]> {
  const ads = await prisma.advertisement.findMany({
    where: buildActiveAdvertisementWhere(placement),
    include: {
      product: {
        select: advertisementProductSelect,
      },
    },
    orderBy: [{ priority: "desc" }],
    take: limit,
  });

  const normalizedAds = ads.map((ad) => ({
    ...ad,
    startDate: ad.startDate ? ad.startDate.toISOString() : null,
    endDate: ad.endDate ? ad.endDate.toISOString() : null,
    createdAt: ad.createdAt.toISOString(),
    updatedAt: ad.updatedAt.toISOString(),
  }));

  return normalizedAds as Advertisement[];
}

export async function getHomePromoAdvertisements(): Promise<Advertisement[]> {
  const now = new Date();

  const ads = await prisma.advertisement.findMany({
    where: {
      status: "active",
      placement: "promobanner",
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    include: { product: { select: advertisementProductSelect } },
    orderBy: [{ slot: "asc" }],
    take: 3,
  });

  return ads.map((ad: any) => ({
    ...ad,
    startDate: ad.startDate ? ad.startDate.toISOString() : null,
    endDate: ad.endDate ? ad.endDate.toISOString() : null,
    createdAt: ad.createdAt.toISOString(),
    updatedAt: ad.updatedAt.toISOString(),
  })) as Advertisement[];
}

export async function getBannerAdvertisements(
  placement: AdvertisementPlacement,
): Promise<Advertisement[]> {
  const meta = AD_PLACEMENTS[placement];
  const ads = await prisma.advertisement.findMany({
    where: buildActiveAdvertisementWhere(placement),
    include: { product: { select: advertisementProductSelect } },
    orderBy: [{ slot: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: meta ? meta.slots.length : 3,
  });

  return ads.map((ad) => ({
    ...ad,
    startDate: ad.startDate ? ad.startDate.toISOString() : null,
    endDate: ad.endDate ? ad.endDate.toISOString() : null,
    createdAt: ad.createdAt.toISOString(),
    updatedAt: ad.updatedAt.toISOString(),
  })) as Advertisement[];
}

