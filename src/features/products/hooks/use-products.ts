"use client";

import { useState, useCallback } from "react";
import { ProductQueryParams, ProductsResponse } from "@/features/products/types/product";
import { useGetProductsQuery } from "@/store/services/api";

type ProductQueryParamKey = keyof ProductQueryParams;

const buildNextParams = (
  prev: ProductQueryParams,
  updates: Partial<ProductQueryParams>
) => {
  const next = { ...prev };

  const entries = Object.entries(updates) as [
    ProductQueryParamKey,
    ProductQueryParams[ProductQueryParamKey] | undefined,
  ][];
  const additions = Object.fromEntries(
    entries.filter(([, value]) => value !== undefined) as [
      ProductQueryParamKey,
      ProductQueryParams[ProductQueryParamKey],
    ][]
  ) as Partial<ProductQueryParams>;

  Object.assign(next, additions);

  entries.forEach(([key, value]) => {
    if (value === undefined && key in next) {
      delete next[key];
    }
  });

  return next;
};

const areValuesEqual = (prev: unknown, next: unknown) => {
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;
    return prev.every((value, index) => value === next[index]);
  }

  return prev === next;
};

const areParamsEqual = (prev: ProductQueryParams, next: ProductQueryParams) => {
  const prevKeys = Object.keys(prev) as ProductQueryParamKey[];
  const nextKeys = Object.keys(next) as ProductQueryParamKey[];

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  return prevKeys.every((key) => areValuesEqual(prev[key], next[key]));
};

export function useProducts(initialParams: ProductQueryParams = {}) {
  const [params, setParams] = useState<ProductQueryParams>(() => ({
    ...initialParams,
  }));

  const {
    data: productsResponse,
    isLoading,
    error,
    refetch,
  } = useGetProductsQuery(params, {
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: false,
  });

  const data: ProductsResponse = productsResponse || {
    products: [],
    pagination: {
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 1,
    },
  };

  const updateParams = useCallback(
    (newParams: Partial<ProductQueryParams>) => {
      setParams((prev) => {
        const next = buildNextParams(prev, newParams);
        if (areParamsEqual(prev, next)) {
          return prev;
        }
        return next;
      });
    },
    [setParams]
  );

  return {
    data,
    loading: isLoading,
    error:
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      null,
    params,
    updateParams,
    refetch,
  };
}
