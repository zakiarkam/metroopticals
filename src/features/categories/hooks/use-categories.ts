"use client";

import { useGetCategoriesQuery } from "@/store/services/api";

export function useCategories() {
  const { data, isLoading, error } = useGetCategoriesQuery(
    { page: 1, limit: 100, status: "active" },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      refetchOnMountOrArgChange: false,
    }
  );

  return {
    categories: data?.categories || [],
    loading: isLoading,
    error:
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      null,
  };
}
