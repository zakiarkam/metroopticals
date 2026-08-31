import axiosInstance from "@/lib/axiosInstance";
import {
  CreateProductInput,
  Product,
  ProductQueryParams as BaseProductQueryParams,
  ProductsResponse,
} from "@/features/products/types/product";

// Extend ProductQueryParams to include signal for request cancellation
type ProductQueryParams = BaseProductQueryParams & {
  signal?: AbortSignal;
};

export type { Product };
export type UpdateProductInput = Partial<CreateProductInput>;

export const getProducts = async (
  params?: ProductQueryParams
): Promise<ProductsResponse> => {
  const queryParams: Record<string, any> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 12,
  };

  if (params?.search) queryParams.search = params.search;
  if (params?.status) queryParams.status = params.status;
  if (params?.category) queryParams.category = params.category;
  if (params?.categories?.length)
    queryParams.categories = params.categories.join(",");

  // Multi-select facet filters, sent as comma-separated lists.
  const listFilters = [
    "brands",
    "genders",
    "shapes",
    "rimTypes",
    "materials",
    "colors",
    "sizes",
  ] as const;
  for (const key of listFilters) {
    const value = params?.[key];
    if (value?.length) queryParams[key] = (value as string[]).join(",");
  }

  if (params?.minPrice !== undefined) queryParams.minPrice = params.minPrice;
  if (params?.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice;

  // The Offers entry point: only products whose discounted price undercuts
  // the list price. Declared on the type all along, but never forwarded  so
  // the shop quietly showed everything.
  if (params?.onSale) queryParams.onSale = "true";

  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  const response = await axiosInstance.get("/products", {
    params: queryParams,
    signal: params?.signal,
  });

  // Support either { success, data } or direct { products, pagination }
  const apiData = response.data;
  const { products, pagination } = apiData.data || apiData;

  return {
    products: products || [],
    pagination: {
      page: pagination?.page || queryParams.page,
      limit: pagination?.limit || queryParams.limit,
      total: pagination?.total || 0,
      totalPages: pagination?.totalPages || 1,
    },
  };
};

export const getProductById = async (id: number): Promise<Product> => {
  const response = await axiosInstance.get(`/products/${id}`);
  return response.data.data?.product || response.data.product;
};

export const createProduct = async (
  data: CreateProductInput
): Promise<Product> => {
  const response = await axiosInstance.post("/products", data);
  return response.data.product;
};

export const updateProduct = async (
  id: number,
  data: UpdateProductInput
): Promise<Product> => {
  const response = await axiosInstance.put(`/products/${id}`, data);
  return response.data.product;
};

export const deleteProduct = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/products/${id}`);
};

export const incrementProductStock = async (
  id: number,
  count: number,
  color?: string
): Promise<Product> => {
  const response = await axiosInstance.patch(`/products/${id}/stock`, {
    count,
    ...(color ? { color } : {}),
  });
  return response.data.product;
};

export const decrementProductStock = async (
  id: number,
  count: number,
  color?: string
): Promise<Product> => {
  const response = await axiosInstance.patch(
    `/products/${id}/stock/decrement`,
    {
      count,
      ...(color ? { color } : {}),
    }
  );
  return response.data.product;
};

export const updateProductStatus = async (
  id: number,
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
): Promise<Product> => {
  const response = await axiosInstance.patch(`/products/${id}/status`, {
    status,
  });
  return response.data.product;
};
