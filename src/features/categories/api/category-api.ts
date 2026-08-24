import axiosInstance from "@/lib/axiosInstance";
import type {
  ApiCategory,
  Category,
  CreateCategoryInput,
} from "@/features/categories/types/category";

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  signal?: AbortSignal;
}

interface CategoriesResponse {
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const mapApiCategory = (apiCategory: ApiCategory | Category): Category => {
  const rawProductCount = (apiCategory as any).productCount;
  const relationCounts = (apiCategory as ApiCategory)._count;
  const countedProducts =
    (relationCounts?.products || 0) +
    ((relationCounts as any)?.brandProducts || 0);

  return {
    id: apiCategory.id,
    name: apiCategory.name,
    slug: apiCategory.slug,
    description: apiCategory.description || undefined,
    status: (apiCategory as any).status || ("active" as const),
    productCount:
      typeof rawProductCount === "number" ? rawProductCount : countedProducts,
    createdAt: apiCategory.createdAt,
    updatedAt: apiCategory.updatedAt,
    parentId: (apiCategory as any).parentId || undefined,
    image: (apiCategory as any).image || undefined,
    _count: {
      products:
        typeof rawProductCount === "number" ? rawProductCount : countedProducts,
    },
  };
};

const buildCategoriesKey = (params?: CategoryQueryParams) =>
  JSON.stringify({
    page: params?.page ?? 1,
    limit: params?.limit ?? 50,
    search: params?.search ?? "",
    status: params?.status ?? "",
  });

export const getCategories = async (
  params?: CategoryQueryParams
): Promise<CategoriesResponse> => {
  const queryParams: Record<string, any> = {
    page: params?.page || 1,
    limit: params?.limit || 50,
  };
  if (params?.search) queryParams.search = params.search;
  if (params?.status) queryParams.status = params.status;

  const response = await axiosInstance.get("/categories", {
    params: queryParams,
    signal: params?.signal,
  });

  const apiData = response.data;
  const { categories, pagination } = apiData.data || apiData;

  return {
    categories: (categories || []).map(mapApiCategory),
    pagination: pagination || {
      page: 1,
      limit: queryParams.limit,
      total: 0,
      totalPages: 1,
    },
  };
};

/**
 * ✅ Dedupe in-flight GETs
 */
const categoriesInFlight = new Map<string, Promise<CategoriesResponse>>();

export const getCategoriesOnce = (params?: CategoryQueryParams) => {
  const key = buildCategoriesKey(params);

  const existing = categoriesInFlight.get(key);
  if (existing) return existing;

  const p = getCategories(params).finally(() => categoriesInFlight.delete(key));
  categoriesInFlight.set(key, p);
  return p;
};

export const getCategoryById = async (id: number): Promise<Category> => {
  const response = await axiosInstance.get(`/categories/${id}`);
  const category = response.data.data?.category || response.data.category;
  return mapApiCategory(category);
};

export const createCategory = async (
  data: CreateCategoryInput
): Promise<Category> => {
  const response = await axiosInstance.post<{ category: ApiCategory }>(
    "/categories",
    data
  );
  return mapApiCategory((response.data as any).category);
};

export const updateCategory = async (
  id: number,
  data: UpdateCategoryInput
): Promise<Category> => {
  const response = await axiosInstance.put<{ category: ApiCategory }>(
    `/categories/${id}`,
    data
  );
  return mapApiCategory((response.data as any).category);
};

export const deleteCategory = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/categories/${id}`);
};

export const updateCategoryStatus = async (
  id: number,
  status: "active" | "inactive"
): Promise<Category> => {
  const response = await axiosInstance.patch<{ category: ApiCategory }>(
    `/categories/${id}/status`,
    { status }
  );
  return mapApiCategory((response.data as any).category);
};
