import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  CreateBrandInput,
  UpdateBrandInput,
} from "@/features/brands/validators/brand";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function getBrands({
  includeInactive = false,
}: { includeInactive?: boolean } = {}) {
  const brands = await prisma.brand.findMany({
    where: includeInactive ? {} : { status: "active" },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return brands.map(({ _count, ...brand }) => ({
    ...brand,
    productCount: _count.products,
  }));
}

export async function getBrandById(id: number) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new NotFoundError("Brand not found");
  return brand;
}

export async function createBrand(data: CreateBrandInput) {
  const slug = slugify(data.slug?.trim() || data.name);

  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) {
    throw new ValidationError("A brand with this name already exists", [
      { path: "name", message: "Brand already exists" },
    ]);
  }

  return prisma.brand.create({
    data: { ...data, slug, logo: data.logo ?? null },
  });
}

export async function updateBrand(id: number, data: UpdateBrandInput) {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.logo !== undefined) updateData.logo = data.logo;

  if (data.slug || data.name) {
    const slug = slugify(data.slug?.trim() || data.name!);
    const clash = await prisma.brand.findFirst({
      where: { slug, NOT: { id } },
    });
    if (clash) {
      throw new ValidationError("A brand with this name already exists", [
        { path: "name", message: "Brand already exists" },
      ]);
    }
    updateData.slug = slug;
  }

  return prisma.brand.update({ where: { id }, data: updateData });
}

export async function deleteBrand(id: number) {
  // Products keep existing; their brandId is cleared so nothing is orphaned.
  await prisma.product.updateMany({
    where: { brandId: id },
    data: { brandId: null },
  });
  await prisma.brand.delete({ where: { id } });
}
