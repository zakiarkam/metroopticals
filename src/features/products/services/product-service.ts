import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from "@/features/products/validators/product";
import { deleteFile } from "@/lib/storage/r2";
import { FRAME_SIZE_RANGES } from "@/features/products/types/product";
import type { FrameShape, Gender } from "@/features/products/types/product";
import type { Prisma, StockReason } from "@prisma/client";

/**
 * Record why a product's stock moved.
 *
 * `Product.stock` on its own can only say what the count is now. Every path
 * that changes it  a website order, a counter bill, a delivery, a correction
 *  writes a row here so a count that looks wrong can be traced.
 */
async function recordStockMovement(
  tx: Prisma.TransactionClient,
  input: {
    productId: number;
    delta: number;
    reason: StockReason;
    note?: string;
    createdById?: number;
  },
) {
  if (input.delta === 0) return;
  await tx.stockMovement.create({
    data: {
      productId: input.productId,
      delta: input.delta,
      reason: input.reason,
      note: input.note ?? null,
      createdById: input.createdById ?? null,
    },
  });
}


export async function getProducts(query: ProductQueryInput) {
  const {
    category,
    categories,
    brands,
    genders,
    shapes,
    rimTypes,
    materials,
    colors,
    sizes,
    search,
    page,
    limit,
    minPrice,
    maxPrice,
    onSale,
    status,
    sortBy,
    sortOrder,
  } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  const andFilters: any[] = [];

  const categoryFilters =
    categories && categories.length > 0
      ? categories
      : category
        ? [category]
        : [];

  if (categoryFilters.length) {
    const slugFilter =
      categoryFilters.length === 1
        ? categoryFilters[0]
        : { in: categoryFilters };

    // Match the category itself or any of its children.
    andFilters.push({
      OR: [
        { category: { slug: slugFilter } },
        { category: { parent: { slug: slugFilter } } },
      ],
    });
  }

  if (brands?.length) {
    andFilters.push({ brand: { slug: { in: brands } } });
  }

  if (onSale) {
    andFilters.push({
      discountedPrice: { not: null, lt: prisma.product.fields.price },
    });
  }

  if (genders?.length) {
    andFilters.push({ gender: { in: genders } });
  }

  if (shapes?.length) {
    andFilters.push({ frameShape: { in: shapes } });
  }

  if (rimTypes?.length) {
    andFilters.push({ rimType: { in: rimTypes } });
  }

  if (materials?.length) {
    // Case-insensitive match on free-text material.
    andFilters.push({
      OR: materials.map((m) => ({
        frameMaterial: { equals: m, mode: "insensitive" },
      })),
    });
  }

  if (colors?.length) {
    // `hasSome` on a string[] is case-sensitive in Postgres, so match the
    // stored casing by comparing against the canonical list the UI offers.
    andFilters.push({ frameColors: { hasSome: colors } });
  }

  if (sizes?.length) {
    andFilters.push({
      OR: sizes.map((size) => {
        const range = FRAME_SIZE_RANGES[size];
        return { lensWidth: { gte: range.min, lte: range.max } };
      }),
    });
  }

  if (search) {
    andFilters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (andFilters.length) {
    where.AND = andFilters;
  }

  // Apply status filter if provided
  if (status) {
    where.status = status;
  }

  // Apply price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) {
      where.price.gte = minPrice;
    }
    if (maxPrice !== undefined) {
      where.price.lte = maxPrice;
    }
  }

  const sortField = sortBy || "createdAt";
  const direction = sortOrder || (sortField === "title" ? "asc" : "desc");

  const orderBy: Record<string, "asc" | "desc"> = {
    [sortField]: direction,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            status: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductFacets(query: ProductQueryInput) {
  const { category, categories, search } = query;

  const scope: any = { status: "ACTIVE" };
  const and: any[] = [];

  const categoryFilters =
    categories && categories.length > 0
      ? categories
      : category
        ? [category]
        : [];

  if (categoryFilters.length) {
    const slugFilter =
      categoryFilters.length === 1
        ? categoryFilters[0]
        : { in: categoryFilters };
    and.push({
      OR: [
        { category: { slug: slugFilter } },
        { category: { parent: { slug: slugFilter } } },
      ],
    });
  }

  if (search) {
    and.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (and.length) scope.AND = and;

  const rows = await prisma.product.findMany({
    where: scope,
    select: {
      gender: true,
      frameShape: true,
      rimType: true,
      frameMaterial: true,
      frameColors: true,
      lensWidth: true,
      brand: { select: { slug: true, name: true } },
    },
  });

  const tally = <T extends string>(values: (T | null | undefined)[]) => {
    const map = new Map<T, number>();
    for (const v of values) {
      if (v == null) continue;
      map.set(v, (map.get(v) ?? 0) + 1);
    }
    return map;
  };

  const genderMap = tally(rows.map((r) => r.gender));
  const shapeMap = tally(rows.map((r) => r.frameShape));
  const rimMap = tally(rows.map((r) => r.rimType));

  // Materials and colours are free text: group case-insensitively but show
  // the first spelling encountered so the label stays human.
  const groupText = (values: string[]) => {
    const map = new Map<string, { label: string; count: number }>();
    for (const raw of values) {
      const key = raw.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { label: raw.trim(), count: 1 });
    }
    return map;
  };

  const materialMap = groupText(
    rows.map((r) => r.frameMaterial ?? "").filter(Boolean),
  );
  const colorMap = groupText(rows.flatMap((r) => r.frameColors ?? []));

  const brandMap = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    if (!r.brand) continue;
    const e = brandMap.get(r.brand.slug);
    if (e) e.count += 1;
    else brandMap.set(r.brand.slug, { label: r.brand.name, count: 1 });
  }

  const sizeMap = new Map<string, number>();
  for (const r of rows) {
    if (r.lensWidth == null) continue;
    for (const [bucket, range] of Object.entries(FRAME_SIZE_RANGES)) {
      if (r.lensWidth >= range.min && r.lensWidth <= range.max) {
        sizeMap.set(bucket, (sizeMap.get(bucket) ?? 0) + 1);
        break;
      }
    }
  }

  const byCountDesc = <T extends { count: number }>(a: T, b: T) =>
    b.count - a.count;

  return {
    genders: Array.from(genderMap).map(([value, count]) => ({ value, count })),
    brands: Array.from(brandMap)
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort(byCountDesc),
    sizes: (["SMALL", "MEDIUM", "LARGE"] as const)
      .map((value) => ({ value, count: sizeMap.get(value) ?? 0 }))
      .filter((s) => s.count > 0),
    shapes: Array.from(shapeMap)
      .map(([value, count]) => ({ value, count }))
      .sort(byCountDesc),
    colors: Array.from(colorMap)
      .map(([, { label, count }]) => ({ value: label, count }))
      .sort(byCountDesc),
    materials: Array.from(materialMap)
      .map(([, { label, count }]) => ({ value: label, count }))
      .sort(byCountDesc),
    rimTypes: Array.from(rimMap)
      .map(([value, count]) => ({ value, count }))
      .sort(byCountDesc),
  };
}

export async function getStockedFrameShapes() {
  const rows = await prisma.product.groupBy({
    by: ["frameShape"],
    where: { status: "ACTIVE", frameShape: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { frameShape: "desc" } },
  });

  return rows
    .filter((row): row is typeof row & { frameShape: FrameShape } =>
      Boolean(row.frameShape),
    )
    .map((row) => ({ value: row.frameShape, count: row._count._all }));
}

export async function getStockedGenders() {
  const rows = await prisma.product.groupBy({
    by: ["gender"],
    where: { status: "ACTIVE", gender: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { gender: "desc" } },
  });

  return rows
    .filter((row): row is typeof row & { gender: Gender } =>
      Boolean(row.gender),
    )
    .map((row) => ({ value: row.gender, count: row._count._all }));
}

export async function getProductById(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
    },
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
}

export async function createProduct(data: CreateProductInput) {
  const slugSource = data.slug?.trim() || data.title;
  const slug = slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const status = data.stock === 0 ? "OUT_OF_STOCK" : data.status;
  const unitType = data.unitType || "PIECES";

  const product = await prisma.product.create({
    data: {
      ...data,
      slug,
      status,
      unitType,
      images: data.images || [],
      catalogueFile: data.catalogueFile || null,
      // Blank rather than empty string: both columns are unique, and Postgres
      // would treat a second empty string as a duplicate while it lets any
      // number of NULLs coexist.
      sku: data.sku?.trim() || null,
      barcode: data.barcode?.trim() || null,
    },
    include: {
      category: true,
      brand: true,
    },
  });

  return product;
}

export async function updateProduct(id: number, data: UpdateProductInput) {
  const updateData: any = {};

  if (data.title) {
    updateData.title = data.title;
  }
  if (data.slug) {
    updateData.slug = data.slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  } else if (data.title) {
    updateData.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.discountedPrice !== undefined)
    updateData.discountedPrice = data.discountedPrice;
  if (data.images !== undefined) updateData.images = data.images;
  if (data.catalogueFile !== undefined)
    updateData.catalogueFile = data.catalogueFile;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.brandId !== undefined) updateData.brandId = data.brandId;
  if (data.unitType !== undefined) updateData.unitType = data.unitType;
  if (data.sku !== undefined) updateData.sku = data.sku?.trim() || null;
  if (data.barcode !== undefined)
    updateData.barcode = data.barcode?.trim() || null;
  if (data.stock !== undefined) {
    updateData.stock = data.stock;
    if (data.stock === 0) {
      updateData.status = "OUT_OF_STOCK";
    } else if (data.status === undefined) {
      updateData.status = "ACTIVE";
    }
  }
  if (data.status !== undefined && data.stock !== 0) {
    updateData.status = data.status;
  }

  // Eyewear spec. `null` is a meaningful value here (clears the field), so
  // these are copied whenever the key is present rather than when truthy.
  const eyewearFields = [
    "lensWidth",
    "bridgeWidth",
    "templeLength",
    "frameColors",
    "frameMaterial",
    "weightGrams",
    "frameShape",
    "rimType",
    "gender",
  ] as const;

  for (const field of eyewearFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      brand: true,
    },
  });

  return product;
}

export async function deleteProduct(id: number) {
  // Fetch product to get file references
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;

  // A product that has ever been sold or counted is part of the history:
  // deleting it would take its order lines and its stock ledger with it, so
  // last month's report would no longer add up. Retiring it is the only
  // honest way to take it off the shelf.
  const [soldLines, movements] = await Promise.all([
    prisma.orderItem.count({ where: { productId: id } }),
    prisma.stockMovement.count({ where: { productId: id } }),
  ]);
  if (soldLines > 0 || movements > 0) {
    throw new ValidationError(
      "This product has sales history. Set it to Inactive instead of deleting it.",
    );
  }

  // Delete images from bucket
  if (Array.isArray(product.images)) {
    await Promise.all(
      product.images.map((fileName: string) =>
        deleteFile("product/image", fileName).catch(() => {}),
      ),
    );
  }
  // Delete catalogue file from bucket
  if (product.catalogueFile) {
    await deleteFile("product/catalogue", product.catalogueFile).catch(
      () => {},
    );
  }

  // Delete product from DB
  await prisma.product.delete({
    where: { id },
  });
}

export async function incrementProductStock(
  id: number,
  count: number,
  adminId?: number,
) {
  return await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id },
      select: { stock: true },
    });
    if (!current) {
      throw new NotFoundError("Product not found");
    }

    await tx.product.update({
      where: { id },
      data: { stock: { increment: count } },
    });

    // Stock arriving only ever clears an out-of-stock badge. A product the
    // shop deliberately retired stays retired: a delivery landing against it
    // must not put it back on the storefront.
    await tx.product.updateMany({
      where: { id, stock: { gt: 0 }, status: "OUT_OF_STOCK" },
      data: { status: "ACTIVE" },
    });

    await recordStockMovement(tx, {
      productId: id,
      delta: count,
      reason: "PURCHASE",
      createdById: adminId,
    });

    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
      },
    });
  }, { timeout: 20_000, maxWait: 10_000 });
}

export async function decrementProductStock(
  id: number,
  count: number,
  adminId?: number,
) {
  return await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!current) {
      throw new NotFoundError("Product not found");
    }

    // Compare and swap: the write only matches while there is still enough on
    // the shelf, so two people taking the last two at the same moment cannot
    // both succeed and leave the count at minus one.
    const moved = await tx.product.updateMany({
      where: { id, stock: { gte: count } },
      data: { stock: { decrement: count } },
    });
    if (moved.count === 0) {
      throw new ValidationError("Insufficient stock to decrement", [
        { path: "count", message: "Count exceeds current stock" },
      ]);
    }

    // The badge is set from the count the database now holds, not from
    // arithmetic on a number read before the write.
    await tx.product.updateMany({
      where: { id, stock: 0 },
      data: { status: "OUT_OF_STOCK" },
    });

    await recordStockMovement(tx, {
      productId: id,
      delta: -count,
      reason: "ADJUSTMENT",
      createdById: adminId,
    });

    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
      },
    });
  }, { timeout: 20_000, maxWait: 10_000 });
}

export async function updateProductStatus(
  id: number,
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK",
) {
  const product = await prisma.product.update({
    where: { id },
    data: { status },
    include: {
      category: true,
    },
  });
  return product;
}
