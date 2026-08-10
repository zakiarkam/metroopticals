import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from "@/features/products/validators/product";
import { deleteFile } from "@/lib/storage/r2";

export async function getProducts(query: ProductQueryInput) {
  const {
    category,
    categories,
    subcategory,
    subcategories,
    search,
    page,
    limit,
    minPrice,
    maxPrice,
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

  let categoryOrFilters: any[] = [];
  if (categoryFilters.length) {
    const slugFilter =
      categoryFilters.length === 1
        ? categoryFilters[0]
        : { in: categoryFilters };

    categoryOrFilters = [
      { category: { slug: slugFilter } },
      { category: { parent: { slug: slugFilter } } },
      { subcategory: { slug: slugFilter } },
      { subcategory: { parent: { slug: slugFilter } } },
    ];
  }

  const subcategoryFilters =
    subcategories && subcategories.length > 0
      ? subcategories
      : subcategory
      ? [subcategory]
      : [];

  if (categoryFilters.length && subcategoryFilters.length) {
    const subcategorySlugFilter =
      subcategoryFilters.length === 1
        ? subcategoryFilters[0]
        : { in: subcategoryFilters };

    andFilters.push({
      OR: [
        ...categoryOrFilters,
        { subcategory: { slug: subcategorySlugFilter } },
      ],
    });
  } else if (categoryFilters.length) {
    andFilters.push({
      OR: categoryOrFilters,
    });
  } else if (subcategoryFilters.length) {
    const subcategorySlugFilter =
      subcategoryFilters.length === 1
        ? subcategoryFilters[0]
        : { in: subcategoryFilters };

    andFilters.push({
      subcategory: { slug: subcategorySlugFilter },
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
        subcategory: {
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

export async function getProductById(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      subcategory: true,
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
      // subcategory: true,
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
  if (data.subcategoryId !== undefined)
    updateData.subcategoryId = data.subcategoryId;
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

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      // subcategory: true,
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
        deleteFile("product/image", fileName).catch(() => {})
      )
    );
  }
  // Delete catalogue file from bucket
  if (product.catalogueFile) {
    await deleteFile("product/catalogue", product.catalogueFile).catch(
      () => {}
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
      // subcategory: true
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
        //subcategory: true
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
        // subcategory: true
      },
    });
    return product;
  });
}

export async function updateProductStatus(
  id: number,
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
) {
  const product = await prisma.product.update({
    where: { id },
    data: { status },
    include: {
      category: true,
      // subcategory: true
    },
  });
  return product;
}
