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

export async function createAdvertisement(data: CreateAdvertisementInput) {
  return prisma.advertisement.create({
    data: {
      title: data.title,
      imageUrl: data.imageUrl,
      link: data.link || null,
      placement: data.placement,
      status: data.status || "active",
      priority: data.priority || 0,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      productId: data.productId,
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
  data: UpdateAdvertisementInput
) {
  const advertisement = await getAdvertisementById(id);

  return prisma.advertisement.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.imageUrl && { imageUrl: data.imageUrl }),
      ...(data.link !== undefined && { link: data.link || null }),
      ...(data.placement && { placement: data.placement }),
      ...(data.status && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
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
  status: "active" | "inactive"
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

export async function incrementAdvertisementView(id: number) {
  return prisma.advertisement.update({
    where: { id },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  });
}

export async function incrementAdvertisementClick(id: number) {
  return prisma.advertisement.update({
    where: { id },
    data: {
      clickCount: {
        increment: 1,
      },
    },
  });
}

const buildActiveAdvertisementWhere = (
  placement?: AdvertisementPlacement
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
  limit?: number
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

export type HomeAdvertisementsResult = {
  position0: Advertisement[]; // under <Categories />
  position1: Advertisement[]; // under <NewArrivals />
  position2: Advertisement[]; // under <BestSeller />
};

export async function getHomeAdvertisements(): Promise<HomeAdvertisementsResult> {
  const now = new Date();
  const baseWhere = {
    status: "active",
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };

  const normalize = (ad: any): Advertisement => ({
    ...ad,
    startDate: ad.startDate ? ad.startDate.toISOString() : null,
    endDate: ad.endDate ? ad.endDate.toISOString() : null,
    createdAt: ad.createdAt.toISOString(),
    updatedAt: ad.updatedAt.toISOString(),
  });

  const [p0, p1, p2] = await Promise.all([
    prisma.advertisement.findMany({
      where: { ...baseWhere, priority: 0 },
      include: { product: { select: advertisementProductSelect } },
      orderBy: [{ slot: "asc" }],
      take: 3,
    }),
    prisma.advertisement.findMany({
      where: { ...baseWhere, priority: 1 },
      include: { product: { select: advertisementProductSelect } },
      orderBy: [{ slot: "asc" }],
      take: 3,
    }),
    prisma.advertisement.findMany({
      where: { ...baseWhere, priority: 2 },
      include: { product: { select: advertisementProductSelect } },
      orderBy: [{ slot: "asc" }],
      take: 3,
    }),
  ]);

  return {
    position0: p0.map(normalize),
    position1: p1.map(normalize),
    position2: p2.map(normalize),
  };
}

export const getProductDetailsUrl = (productId: number) => {
  const slug = `/shop-details/${productId}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${slug}`;
  }
  return slug;
};
