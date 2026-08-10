"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import AddCategoryDialog from "./modals/AddCategoryDialog";
import EditCategoryDialog from "./modals/EditCategoryDialog";
import DeleteAlertDialog from "@/components/modals/DeleteAlertDialog";
import CategoryStatusDialog from "./modals/CategoryStatusDialog";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/features/categories/api/category-api";
import { Category } from "@/features/categories/types/category";
import { Toast } from "@/lib/utils/toast";
import { useGetCategoriesQuery } from "@/store/services/api";

type CategoriesTabProps = {
  dateRange: string;
};

function useDebouncedValue<T>(value: T, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ dateRange }) => {
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] =
    useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 500);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [categoryForStatus, setCategoryForStatus] = useState<Category | null>(
    null
  );

  const [expandedParents, setExpandedParents] = useState<Set<number>>(
    () => new Set()
  );

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [currentPage, itemsPerPage, debouncedSearch, statusFilter]
  );

  const {
    data: cachedCategories,
    isLoading,
    error,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(queryParams, { refetchOnFocus: true });

  const categories = useMemo(
    () => cachedCategories?.categories || [],
    [cachedCategories]
  );
  const totalPages = cachedCategories?.pagination.totalPages || 1;
  const totalCategories = cachedCategories?.pagination.total || 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, itemsPerPage]);

  useEffect(() => {
    if (!error) return;
    const message =
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      "Failed to load categories";
    Toast.error(message);
  }, [error]);

  const handleLimitChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleCategoriesChanged = useCallback(() => {
    refetchCategories();
  }, [refetchCategories]);

  const childrenByParent = useMemo(() => {
    const map: Record<number, Category[]> = {};
    categories.forEach((category) => {
      if (category.parentId) {
        map[category.parentId] = map[category.parentId] || [];
        map[category.parentId].push(category);
      }
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name))
    );
    return map;
  }, [categories]);

  const groupedCategories = useMemo(() => {
    const mainCategories = categories
      .filter((category) => !category.parentId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const ordered: Category[] = [];
    const seen = new Set<number>();

    mainCategories.forEach((category) => {
      ordered.push(category);
      seen.add(category.id);
      (childrenByParent[category.id] || []).forEach((child) => {
        ordered.push(child);
        seen.add(child.id);
      });
    });

    const orphans = categories
      .filter((category) => !seen.has(category.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...ordered, ...orphans];
  }, [categories, childrenByParent]);

  const toggleExpanded = (id: number) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    const toastId = Toast.loading(`Deleting "${categoryToDelete.name}"...`);

    try {
      await deleteCategory(categoryToDelete.id);

      Toast.update(toastId, {
        render: "Category deleted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      handleCategoriesChanged();

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete category:", error);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete category. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (category: Category) => {
    setCategoryToEdit(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleStatusChange = (category: Category) => {
    setCategoryForStatus(category);
    setStatusDialogOpen(true);
  };

  const statusPill = (status: "active" | "inactive") => {
    return status === "active"
      ? "bg-green-light-6 text-green border border-green/20 hover:bg-green-light-5"
      : "bg-gray-2 text-dark-3 border border-gray-3 hover:bg-gray-3";
  };

  return (
    <div className="space-y-7.5">
      <div className="rounded-xl border border-gray-3 bg-white shadow-1">
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
          <div>
            <h3 className="text-custom-lg font-semibold text-dark">
              All Categories
            </h3>
            <p className="text-custom-xs text-body">
              {totalCategories} total categories
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-64 rounded-lg border border-gray-3 bg-gray-1 pl-10 pr-4 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Status Filter */}
            <div className="flex h-8 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
              {["all", "active", "inactive"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter as any)}
                  className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                    statusFilter === filter
                      ? "bg-white text-blue shadow-1"
                      : "text-body hover:text-dark"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setIsAddCategoryDialogOpen(true)}
              className="h-8 bg-blue hover:bg-blue-dark"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 4V16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M4 10H16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Add category
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[60px_2fr_1fr_1fr_100px] gap-4 border-b border-gray-3 px-5 py-3 text-custom-xs uppercase text-body tracking-wide">
              <span>No</span>
              <span>Category</span>
              <span>Products</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {isLoading ? (
              <div className="px-5 py-10 text-center text-custom-sm text-body">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="px-5 py-10 text-center text-custom-sm text-body">
                No categories found. Create your first category to get started.
              </div>
            ) : (
              (() => {
                let parentCounter = (currentPage - 1) * itemsPerPage;

                return groupedCategories.map((category) => {
                  if (
                    category.parentId &&
                    !expandedParents.has(category.parentId)
                  ) {
                    return null;
                  }

                  const hasChildren =
                    (childrenByParent[category.id] || []).length > 0;
                  const rowNumber = category.parentId ? "" : ++parentCounter;

                  return (
                    <div
                      key={category.id}
                      className="grid grid-cols-[60px_2fr_1fr_1fr_100px] gap-4 px-5 py-4 text-custom-sm border-b border-gray-2 last:border-0 items-center hover:bg-gray-1 transition"
                    >
                      <div className="text-custom-xs text-body">
                        {rowNumber}
                      </div>

                      <div
                        className={`flex flex-col gap-1 ${
                          category.parentId
                            ? "border-l-2 border-gray-3 pl-4"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {hasChildren && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleExpanded(category.id)}
                              aria-label="Toggle children"
                              className="h-6 w-6 border-gray-3 text-body hover:text-blue hover:border-blue"
                            >
                              <svg
                                className={`h-3 w-3 transition-transform ${
                                  expandedParents.has(category.id)
                                    ? "rotate-90"
                                    : ""
                                }`}
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M6.5 4.5L10 8L6.5 11.5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </Button>
                          )}
                          <p className="font-medium text-dark">
                            {category.name}
                          </p>
                        </div>
                        <p className="text-custom-xs text-body line-clamp-2">
                          {category.description || "No description"}
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">
                          {category._count?.products ?? 0}
                        </p>
                        <p className="text-custom-xs text-body">products</p>
                      </div>

                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(category)}
                          className={`h-7 rounded-full px-2.5 text-custom-xs font-medium capitalize transition hover:bg-transparent ${statusPill(
                            category.status
                          )}`}
                          title="Click to change status"
                        >
                          <span>{category.status}</span>
                          <svg
                            className="h-3 w-3 transition"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M4 6L8 10L12 6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(category)}
                          className="h-8 w-8 text-blue hover:text-blue-dark hover:bg-blue-light-6 transition"
                          title="Edit"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M14.166 2.5C14.3849 2.28113 14.6447 2.10752 14.9307 1.98906C15.2167 1.87061 15.5232 1.80957 15.8327 1.80957C16.1422 1.80957 16.4487 1.87061 16.7347 1.98906C17.0206 2.10752 17.2805 2.28113 17.4993 2.5C17.7182 2.71887 17.8918 2.97871 18.0103 3.26468C18.1287 3.55064 18.1898 3.85714 18.1898 4.16667C18.1898 4.47619 18.1287 4.78269 18.0103 5.06866C17.8918 5.35462 17.7182 5.61446 17.4993 5.83333L6.24935 17.0833L1.66602 18.3333L2.91602 13.75L14.166 2.5Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(category)}
                          className="h-8 w-8 text-red hover:text-red-dark hover:bg-red-light-6 transition"
                          title="Delete"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M2.5 5H4.16667H17.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M15.8333 5V16.6667C15.8333 17.5 15 18.3333 14.1667 18.3333H5.83333C5 18.3333 4.16667 17.5 4.16667 16.6667V5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {!isLoading && categories.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCategories}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleLimitChange}
            showItemsPerPage={true}
            itemsPerPageOptions={[6, 12, 24, 48, 96]}
          />
        )}
      </div>

      <AddCategoryDialog
        isOpen={isAddCategoryDialogOpen}
        onClose={() => setIsAddCategoryDialogOpen(false)}
        onSuccess={handleCategoriesChanged}
        categories={categories}
      />

      <EditCategoryDialog
        isOpen={isEditCategoryDialogOpen}
        onClose={() => {
          setIsEditCategoryDialogOpen(false);
          setCategoryToEdit(null);
        }}
        onSuccess={handleCategoriesChanged}
        category={categoryToEdit}
        categories={categories}
      />

      <CategoryStatusDialog
        isOpen={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setCategoryForStatus(null);
        }}
        onSuccess={handleCategoriesChanged}
        categoryId={categoryForStatus?.id || null}
        categoryName={categoryForStatus?.name || ""}
        currentStatus={categoryForStatus?.status || "active"}
      />

      <DeleteAlertDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        itemName={categoryToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default CategoriesTab;
