import { createApi } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosError } from "axios";
import axiosInstance from "@/lib/axiosInstance";
import type {
  CreateProductInput,
  Product,
  ProductQueryParams,
  ProductsResponse,
} from "@/features/products/types/product";
import type { Category, CreateCategoryInput } from "@/features/categories/types/category";
import type {
  Advertisement,
  AdvertisementsResponse,
  CreateAdvertisementInput,
  UpdateAdvertisementInput,
  UpdateAdvertisementStatusInput,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
  UserQueryParams,
  UsersResponse,
} from "@/features/users/types/user";
import type {
  Order,
  OrdersResponse,
  UpdateOrderStatusInput,
} from "@/features/orders/types/order";
import type { DashboardData } from "@/features/dashboard/types/dashboard";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  incrementProductStock,
  decrementProductStock,
} from "@/features/products/api/product-api";
import {
  getCategoriesOnce,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
} from "@/features/categories/api/category-api";
import {
  getAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  updateAdvertisementStatus,
} from "@/features/advertisements/api/advertisement-api";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "@/features/users/api/user-api";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "@/features/orders/api/orders-api";
import { getDashboardDataOnce } from "@/features/dashboard/api/dashboard-api";

type QueryError = {
  status: string | number;
  data?: unknown;
};

const toQueryError = (error: unknown): QueryError => {
  const err = error as AxiosError<any>;
  return {
    status: err.response?.status || "CUSTOM_ERROR",
    data: err.response?.data || err.message || "Request failed",
  };
};

const axiosBaseQuery =
  (): BaseQueryFn<
    {
      url: string;
      method?: "get" | "post" | "put" | "patch" | "delete";
      data?: unknown;
      params?: Record<string, unknown>;
    },
    unknown,
    QueryError
  > =>
  async ({ url, method = "get", data, params }) => {
    try {
      const result = await axiosInstance({
        url,
        method,
        data,
        params,
      });
      return { data: result.data };
    } catch (error) {
      return { error: toQueryError(error) };
    }
  };

export const api = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    "Products",
    "Product",
    "Categories",
    "Category",
    "Ads",
    "Users",
    "Orders",
    "Dashboard",
  ],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, ProductQueryParams | void>({
      async queryFn(args, api) {
        try {
          const data = await getProducts({
            ...(args || {}),
            signal: api.signal,
          });
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Products", id: "LIST" },
              ...result.products.map((product) => ({
                type: "Product" as const,
                id: product.id,
              })),
            ]
          : [{ type: "Products", id: "LIST" }],
      keepUnusedDataFor: 300,
    }),
    getProductById: builder.query<Product, string>({
      async queryFn(id) {
        try {
          const data = await getProductById(Number(id));
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),
    createProduct: builder.mutation<Product, CreateProductInput>({
      async queryFn(data) {
        try {
          const product = await createProduct(data);
          return { data: product };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Products", id: "LIST" }],
    }),
    updateProduct: builder.mutation<
      Product,
      { id: string; data: Partial<CreateProductInput> }
    >({
      async queryFn({ id, data }) {
        try {
          const product = await updateProduct(Number(id), data);
          return { data: product };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Product", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),
    deleteProduct: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteProduct(Number(id));
          return { data: undefined };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Products", id: "LIST" }],
    }),
    updateProductStatus: builder.mutation<
      Product,
      { id: string; status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" }
    >({
      async queryFn({ id, status }) {
        try {
          const product = await updateProductStatus(Number(id), status);
          return { data: product };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Product", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),
    incrementProductStock: builder.mutation<
      Product,
      { id: string; count: number }
    >({
      async queryFn({ id, count }) {
        try {
          const product = await incrementProductStock(Number(id), count);
          return { data: product };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Product", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),
    decrementProductStock: builder.mutation<
      Product,
      { id: string; count: number }
    >({
      async queryFn({ id, count }) {
        try {
          const product = await decrementProductStock(Number(id), count);
          return { data: product };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Product", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),
    getCategories: builder.query<
      {
        categories: Category[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      {
        page?: number;
        limit?: number;
        search?: string;
        status?: "active" | "inactive";
      } | void
    >({
      async queryFn(args, api) {
        try {
          const data = await getCategoriesOnce({
            ...(args || {}),
            signal: api.signal,
          });
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Categories", id: "LIST" },
              ...result.categories.map((category) => ({
                type: "Category" as const,
                id: category.id,
              })),
            ]
          : [{ type: "Categories", id: "LIST" }],
      keepUnusedDataFor: 300,
    }),
    getCategoryById: builder.query<Category, string>({
      async queryFn(id) {
        try {
          const data = await getCategoryById(Number(id));
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (_result, _error, id) => [{ type: "Category", id }],
    }),
    createCategory: builder.mutation<Category, CreateCategoryInput>({
      async queryFn(data) {
        try {
          const category = await createCategory(data);
          return { data: category };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Categories", id: "LIST" }],
    }),
    updateCategory: builder.mutation<
      Category,
      { id: string; data: Partial<CreateCategoryInput> }
    >({
      async queryFn({ id, data }) {
        try {
          const category = await updateCategory(Number(id), data);
          return { data: category };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Category", id: arg.id },
        { type: "Categories", id: "LIST" },
      ],
    }),
    deleteCategory: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteCategory(Number(id));
          return { data: undefined };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Categories", id: "LIST" }],
    }),
    updateCategoryStatus: builder.mutation<
      Category,
      { id: string; status: "active" | "inactive" }
    >({
      async queryFn({ id, status }) {
        try {
          const category = await updateCategoryStatus(Number(id), status);
          return { data: category };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Category", id: arg.id },
        { type: "Categories", id: "LIST" },
      ],
    }),
    getAdvertisements: builder.query<
      AdvertisementsResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
        status?: "active" | "inactive";
        placement?: AdvertisementPlacement;
      } | void
    >({
      async queryFn(args) {
        try {
          const data = await getAdvertisements(args || undefined);
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Ads", id: "LIST" },
              ...result.advertisements.map((ad) => ({
                type: "Ads" as const,
                id: ad.id,
              })),
            ]
          : [{ type: "Ads", id: "LIST" }],
      keepUnusedDataFor: 300,
    }),
    getAdvertisementById: builder.query<Advertisement, string>({
      async queryFn(id) {
        try {
          const data = await getAdvertisementById(Number(id));
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (_result, _error, id) => [{ type: "Ads", id }],
    }),
    createAdvertisement: builder.mutation<
      Advertisement,
      CreateAdvertisementInput
    >({
      async queryFn(data) {
        try {
          const ad = await createAdvertisement(data);
          return { data: ad };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Ads", id: "LIST" }],
    }),
    updateAdvertisement: builder.mutation<
      Advertisement,
      { id: string; data: UpdateAdvertisementInput }
    >({
      async queryFn({ id, data }) {
        try {
          const ad = await updateAdvertisement(Number(id), data);
          return { data: ad };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Ads", id: arg.id },
        { type: "Ads", id: "LIST" },
      ],
    }),
    updateAdvertisementStatus: builder.mutation<
      Advertisement,
      { id: string; data: UpdateAdvertisementStatusInput }
    >({
      async queryFn({ id, data }) {
        try {
          const ad = await updateAdvertisementStatus(Number(id), data);
          return { data: ad };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Ads", id: arg.id },
        { type: "Ads", id: "LIST" },
      ],
    }),
    deleteAdvertisement: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteAdvertisement(Number(id));
          return { data: undefined };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Ads", id: "LIST" }],
    }),
    getUsers: builder.query<UsersResponse, UserQueryParams | void>({
      async queryFn(args) {
        try {
          const data = await getUsers(args || undefined);
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Users", id: "LIST" },
              ...result.items.map((user) => ({
                type: "Users" as const,
                id: user.id,
              })),
            ]
          : [{ type: "Users", id: "LIST" }],
    }),
    getUserById: builder.query<User, string>({
      async queryFn(id) {
        try {
          const data = await getUserById(Number(id));
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (_result, _error, id) => [{ type: "Users", id }],
    }),
    createUser: builder.mutation<User, CreateUserInput>({
      async queryFn(data) {
        try {
          const user = await createUser(data);
          return { data: user };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),
    updateUser: builder.mutation<User, { id: string; data: UpdateUserInput }>({
      async queryFn({ id, data }) {
        try {
          const user = await updateUser(Number(id), data);
          return { data: user };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Users", id: arg.id },
        { type: "Users", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation<void, string>({
      async queryFn(id) {
        try {
          await deleteUser(Number(id));
          return { data: undefined };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),
    getOrders: builder.query<
      OrdersResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        channel?: "ONLINE" | "POS" | "ALL";
        ownOnly?: boolean;
      } | void
    >({
      async queryFn(args) {
        try {
          const data = await getOrders(args || undefined);
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (result) =>
        result
          ? [
              { type: "Orders", id: "LIST" },
              ...result.orders.map((order) => ({
                type: "Orders" as const,
                id: order.id,
              })),
            ]
          : [{ type: "Orders", id: "LIST" }],
    }),
    getOrderById: builder.query<Order, string>({
      async queryFn(id) {
        try {
          const data = await getOrderById(Number(id));
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),
    updateOrderStatus: builder.mutation<
      Order,
      { id: string; data: UpdateOrderStatusInput }
    >({
      async queryFn({ id, data }) {
        try {
          const order = await updateOrderStatus(Number(id), data);
          return { data: order };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: "Orders", id: arg.id },
        { type: "Orders", id: "LIST" },
      ],
    }),
    getDashboard: builder.query<DashboardData, { dateRange?: string } | void>({
      async queryFn(args) {
        try {
          const data = await getDashboardDataOnce(args || undefined);
          return { data };
        } catch (error) {
          return { error: toQueryError(error) };
        }
      },
      providesTags: [{ type: "Dashboard", id: "MAIN" }],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateProductStatusMutation,
  useIncrementProductStockMutation,
  useDecrementProductStockMutation,
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryStatusMutation,
  useGetAdvertisementsQuery,
  useGetAdvertisementByIdQuery,
  useCreateAdvertisementMutation,
  useUpdateAdvertisementMutation,
  useUpdateAdvertisementStatusMutation,
  useDeleteAdvertisementMutation,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useGetDashboardQuery,
} = api;
