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

  /*
   * "On sale" is a real comparison between two columns, not just "has a
   * discounted price set"  plenty of rows carry a `discountedPrice` equal to
   * the list price. Prisma field references express that without raw SQL.
   */
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

/**
 * Counts for each filter option in the sidebar.
 *
 * Counts are computed against the *category/search* scope only, not the
 * currently ticked filters  otherwise ticking "Men" would drop every other
 * gender to zero and make them un-tickable.
 */
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

/**
 * Frame shapes the shop can actually show something for.
 *
 * The navigation used to list all eight `FrameShape` enum members, so a shopper
 * could pick "Browline" from the menu and land on an empty grid. This reads the
 * shapes present on live products, so the menu can only ever offer a shape that
 * has stock behind it.
 */
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

/**
 * Wearer categories with stock behind them, most-stocked first.
 *
 * Same reason as `getStockedFrameShapes`: the menu offered "Kids" whether or
 * not a single kids' frame was listed.
 */
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

export async function updateProductStock(id: number, stock: number) {
  const updateData: Record<string, any> = { stock };
  if (stock === 0) {
    updateData.status = "OUT_OF_STOCK";
  } else {
    updateData.status = "ACTIVE";
  }
  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
    },
  });
  return product;
}

export async function incrementProductStock(id: number, count: number) {
  return await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id },
      select: { stock: true },
    });
    if (!current) {
      throw new NotFoundError("Product not found");
    }
    const newStock = current.stock + count;
    const updateData: Record<string, any> = {
      stock: { increment: count },
    };
    if (newStock === 0) {
      updateData.status = "OUT_OF_STOCK";
    } else if (newStock > 0) {
      updateData.status = "ACTIVE";
    }
    const product = await tx.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
    return product;
  });
}

export async function decrementProductStock(id: number, count: number) {
  return await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id },
      select: { stock: true },
    });
    if (!current) {
      throw new NotFoundError("Product not found");
    }
    if (count > current.stock) {
      throw new ValidationError("Insufficient stock to decrement", [
        { path: "count", message: "Count exceeds current stock" },
      ]);
    }
    const newStock = current.stock - count;
    const updateData: Record<string, any> = {
      stock: { decrement: count },
    };
    if (newStock === 0) {
      updateData.status = "OUT_OF_STOCK";
    }
    const product = await tx.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
    return product;
  });
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
