import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/features/categories/validators/category";

interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
}

const CATEGORY_SUPPORTS_STATUS =
  "status" in (Prisma.CategoryScalarFieldEnum as Record<string, string>);

/**
 * Active categories with their active children, for the storefront header.
 *
 * Unpaginated and lean on purpose: the menu needs every top-level category in
 * display order and nothing else, on every page render.
 */
export async function getNavCategories() {
  return prisma.category.findMany({
    where: { parentId: null, status: "active" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      children: {
        where: { status: "active" },
        select: { id: true, name: true, slug: true, status: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Which wearers ("Suits" on the product page  Men, Women, Unisex, Kids)
 * actually appear among a category's sellable products.
 *
 * Grouped per category so a menu can offer "Men" under Eyeglasses only when
 * there are men's eyeglasses to land on  a link to an empty shop page
 * teaches people not to use the menu.
 */
export async function getStockedGendersByCategory() {
  const rows = await prisma.product.groupBy({
    by: ["categoryId", "gender"],
    where: {
      status: "ACTIVE",
      gender: { not: null },
      categoryId: { not: null },
    },
  });

  const byCategory = new Map<number, Set<string>>();
  for (const row of rows) {
    if (row.categoryId == null || row.gender == null) continue;
    if (!byCategory.has(row.categoryId)) byCategory.set(row.categoryId, new Set());
    byCategory.get(row.categoryId)!.add(row.gender);
  }
  return byCategory;
}

export async function getCategories(params?: GetCategoriesParams) {
  const { page = 1, limit = 50, search = "", status } = params || {};
  const skip = (page - 1) * limit;

  const where: Prisma.CategoryWhereInput = {
    parentId: null, // Only get parent categories for pagination
  };

  if (status && CATEGORY_SUPPORTS_STATUS) {
    (where as Prisma.CategoryWhereInput & { status?: string }).status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status && !CATEGORY_SUPPORTS_STATUS) {
    const { categories, total } = await getCategoriesWithFallbackStatusFilter(
      where,
      status,
      skip,
      limit
    );

    // Get all children for the paginated parents
    const parentIds = categories.map((c) => c.id);
    const children = await prisma.category.findMany({
      where: { parentId: { in: parentIds } },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const filteredChildren = status
      ? children.filter((category) => {
          const categoryStatus = (
            (category as any).status || "active"
          ).toLowerCase();
          return categoryStatus === status;
        })
      : children;

    const childrenWithCount = filteredChildren.map((cat: any) => ({
      ...cat,
      _count: {
        products:
          cat._count?.products || 0,
      },
    }));

    const categoriesWithTotalCount =
      await attachActiveProductCountsToCategories([
        ...categories,
        ...childrenWithCount,
      ]);

    return {
      categories: categoriesWithTotalCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get paginated parent categories and total count
  const [parentCategories, totalParents] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        name: "asc",
      },
    }),
    prisma.category.count({ where }),
  ]);

  // Get all children for the paginated parents
  const parentIds = parentCategories.map((c) => c.id);
  const childWhere: Prisma.CategoryWhereInput = {
    parentId: { in: parentIds },
  };
  if (status && CATEGORY_SUPPORTS_STATUS) {
    (childWhere as Prisma.CategoryWhereInput & { status?: string }).status =
      status;
  }
  const childCategories = await prisma.category.findMany({
    where: childWhere,
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Combine parents and their children with total count
  const allCategories = [...parentCategories, ...childCategories];
  const categoriesWithTotalCount =
    await attachActiveProductCountsToCategories(allCategories);

  return {
    categories: categoriesWithTotalCount,
    pagination: {
      page,
      limit,
      total: totalParents, // Only count parent categories
      totalPages: Math.ceil(totalParents / limit),
    },
  };
}

async function getCategoriesWithFallbackStatusFilter(
  where: Prisma.CategoryWhereInput,
  status: "active" | "inactive",
  skip: number,
  limit: number
) {
  const allCategories = await prisma.category.findMany({
    where,
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const filtered = allCategories.filter((category) => {
    const categoryStatus = ((category as any).status || "active").toLowerCase();
    return categoryStatus === status;
  });

  const paginated = filtered.slice(skip, skip + limit);

  return {
    categories: paginated,
    total: filtered.length,
  };
}

async function attachActiveProductCountsToCategories(categories: any[]) {
  if (!categories.length) {
    return categories;
  }

  const uniqueIds = Array.from(
    new Set(
      categories
        .map((category) => category.id)
        .filter((id: unknown): id is number => typeof id === "number")
    )
  );
  const counts = await getActiveProductCounts(uniqueIds);

  return categories.map((category) => {
    const count = counts[category.id] ?? 0;
    return {
      ...category,
      productCount: count,
      _count: {
        products: count,
      },
    };
  });
}

async function getActiveProductCounts(categoryIds: number[]) {
  const uniqueIds = Array.from(
    new Set(categoryIds.filter((id): id is number => typeof id === "number"))
  );
  if (!uniqueIds.length) {
    return {};
  }

  const [categoryCounts] = await Promise.all([
    prisma.product.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: uniqueIds },
      } satisfies Prisma.ProductWhereInput,
      _count: {
        _all: true,
      },
    }),
  ]);

  const counts: Record<number, number> = {};

  const addCount = (id: number | null, count: number) => {
    if (!id) return;
    counts[id] = (counts[id] || 0) + count;
  };

  categoryCounts.forEach((entry: any) =>
    addCount(entry.categoryId ?? null, entry._count._all || 0)
  );
  return counts;
}

export async function getCategoryById(id: number) {
  const category: any = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  const [categoryWithCount] = await attachActiveProductCountsToCategories([
    category,
  ]);

  return categoryWithCount;
}

export async function createCategory(data: CreateCategoryInput) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return prisma.category.create({
    data: {
      ...data,
      slug,
      // parentId: (data as any).parentId ?? undefined,
    },
  });
}

export async function updateCategory(id: number, data: UpdateCategoryInput) {
  const updateData: any = {};

  if (data.name) {
    updateData.name = data.name;
    updateData.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  if (data.description !== undefined) updateData.description = data.description;
  if ("image" in data) updateData.image = data.image;
  if ((data as any).parentId !== undefined)
    updateData.parentId = (data as any).parentId;

  return prisma.category.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteCategory(id: number) {
  const [products, children] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);
  if (products > 0 || children > 0) {
    throw new ValidationError(
      `Category still has ${products} product(s) and ${children} sub-categor${children === 1 ? "y" : "ies"}. Move or delete them first.`
    );
  }
  await prisma.category.delete({
    where: { id },
  });
}

export async function updateCategoryStatus(
  id: number,
  status: "active" | "inactive"
) {
  await getCategoryById(id);

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: { status } as any,
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  const [categoryWithCount] = await attachActiveProductCountsToCategories([
    updatedCategory,
  ]);

  return categoryWithCount;
}
