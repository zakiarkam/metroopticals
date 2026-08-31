import { createApi } from "@reduxjs/toolkit/query/react";
import type { AxiosError } from "axios";
import type {
  ProductQueryParams,
  ProductsResponse,
} from "@/features/products/types/product";
import type { Category } from "@/features/categories/types/category";
import type {
  AdvertisementsResponse,
  AdvertisementPlacement,
} from "@/features/advertisements/types/advertisement";
import type { UserQueryParams, UsersResponse } from "@/features/users/types/user";
import type { OrdersResponse } from "@/features/orders/types/order";
import type { DashboardData } from "@/features/dashboard/types/dashboard";
import { getProducts } from "@/features/products/api/product-api";
import { getCategoriesOnce } from "@/features/categories/api/category-api";
import { getAdvertisements } from "@/features/advertisements/api/advertisement-api";
import { getUsers } from "@/features/users/api/user-api";
import { getOrders } from "@/features/orders/api/orders-api";
import { getDashboardDataOnce } from "@/features/dashboard/api/dashboard-api";

/**
 * RTK Query is used purely as the admin's list cache: the tabs read their
 * tables through these queries, and after any write (made through the plain
 * `*-api.ts` clients) they invalidate the matching tag to refetch. Only the
 * list endpoints live here — per-record reads and writes go through the
 * feature API clients directly.
 */

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

export const api = createApi({
  reducerPath: "api",
  // Every endpoint fetches through its feature client in queryFn, so the
  // base query is never reached; it only satisfies createApi's signature.
  baseQuery: async () => ({ data: undefined }),
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
  useGetCategoriesQuery,
  useGetAdvertisementsQuery,
  useGetUsersQuery,
  useGetOrdersQuery,
  useGetDashboardQuery,
} = api;
