"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AddProductDialog from "./modals/AddProductDialog";
import EditProductDialog from "./modals/EditProductDialog";
import ProductDetailDialog from "./modals/ProductDetailDialog";
import DeleteAlertDialog from "@/components/modals/DeleteAlertDialog";
import StockDialog from "./modals/StockDialog";
import StatusDialog from "./modals/StatusDialog";

import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { deleteProduct } from "@/features/products/api/product-api";
import { api, useGetProductsQuery } from "@/store/services/api";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/store";
import { toEyewearFormFields } from "./types";

import { Product } from "@/features/products/types/product";
import { Toast } from "@/lib/utils/toast";
import { getUnitLabel } from "@/lib/utils/price";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriesCache } from "@/features/categories/hooks/use-categories-cache";

type ProductsTabProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateRange: string;
};

/** ✅ Small hook: debounce ONLY the search text */
function useDebouncedValue<T>(value: T, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

const ProductsTab: React.FC<ProductsTabProps> = ({
  searchTerm,
  setSearchTerm,
  dateRange,
}) => {
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<
    "all" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
  >(() => {
    const statusParam = searchParams.get("status");
    return statusParam === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "all";
  });

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(localSearchTerm, 500);

  const { data: cachedCategories, error: categoriesError } = useCategoriesCache(
    { page: 1, limit: 200 },
    { staleTimeMs: 10 * 60 * 1000 }
  );

  const categories = cachedCategories?.categories || [];

  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [duplicateSourceProduct, setDuplicateSourceProduct] =
    useState<Product | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(6);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogType, setStockDialogType] = useState<
    "increment" | "decrement"
  >("increment");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const productsQueryParams = useMemo(
    () => ({
      search: debouncedSearch,
      page: currentPage,
      limit,
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
    }),
    [debouncedSearch, currentPage, limit, statusFilter, categoryFilter]
  );

  const {
    data: cachedProducts,
    isLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery(productsQueryParams, { refetchOnFocus: true });

  const products = cachedProducts?.products || [];
  const totalPages = cachedProducts?.pagination.totalPages || 1;
  const totalProducts = cachedProducts?.pagination.total || 0;

  useEffect(() => {
    if (!categoriesError) return;
    const message =
      (categoriesError as any)?.data?.message ||
      (categoriesError as any)?.data ||
      (categoriesError as any)?.error ||
      "Failed to load categories";
    Toast.error(message);
  }, [categoriesError]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter, limit]);

  useEffect(() => {
    if (!productsError) return;
    const message =
      (productsError as any)?.data?.message ||
      (productsError as any)?.data ||
      (productsError as any)?.error ||
      "Failed to load products";
    Toast.error(message);
  }, [productsError]);

  /** Keep your query param behavior */
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "OUT_OF_STOCK") {
      setStatusFilter("OUT_OF_STOCK");
    }
  }, [searchParams]);

  const dispatch = useDispatch<AppDispatch>();

  const handleProductsChanged = useCallback(() => {
    dispatch(api.util.invalidateTags([{ type: "Products", id: "LIST" }]));
    refetchProducts();
  }, [dispatch, refetchProducts]);

  const duplicatePrefill = useMemo(
    () =>
      duplicateSourceProduct
        ? {
            title: duplicateSourceProduct.title,
            slug: duplicateSourceProduct.slug,
            categoryId: duplicateSourceProduct.categoryId,
            brandId: duplicateSourceProduct.brandId ?? null,
            price: duplicateSourceProduct.price,
            discountedPrice: duplicateSourceProduct.discountedPrice ?? undefined,
            stock: duplicateSourceProduct.stock,
            unitType: duplicateSourceProduct.unitType,
            status: duplicateSourceProduct.status,
            description: duplicateSourceProduct.description,
            ...toEyewearFormFields(duplicateSourceProduct),
          }
        : undefined,
    [duplicateSourceProduct],
  );

  const handleViewDetails = (productId: number) => {
    setSelectedProductId(productId);
    setIsDetailDialogOpen(true);
  };

  const handleEditClick = (productId: number) => {
    setSelectedProductId(productId);
    setIsEditProductDialogOpen(true);
  };

  const handleDuplicateClick = (product: Product) => {
    setDuplicateSourceProduct(product);
    setIsAddProductDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    const toastId = Toast.loading(`Deleting "${productToDelete.title}"...`);

    try {
      await deleteProduct(productToDelete.id);

      Toast.update(toastId, {
        render: "Product deleted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      // refresh cached list after mutation
      handleProductsChanged();

      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete product:", error);

      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete product. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStockIncrement = (product: Product) => {
    setSelectedProduct(product);
    setStockDialogType("increment");
    setStockDialogOpen(true);
  };

  const handleStockDecrement = (product: Product) => {
    setSelectedProduct(product);
    setStockDialogType("decrement");
    setStockDialogOpen(true);
  };

  const handleStatusChange = (product: Product) => {
    setSelectedProduct(product);
    setStatusDialogOpen(true);
  };

  const statusPill = (status: string) => {
    const key = (status || "").toString().toUpperCase();
    switch (key) {
      case "ACTIVE":
        return "bg-green-light-6 text-green border border-green/20 hover:bg-green-light-5";
      case "INACTIVE":
        return "bg-red-light-6 text-red border border-red/20 hover:bg-red-light-5";
      case "OUT_OF_STOCK":
        return "bg-yellow-light-4 text-yellow-dark border border-yellow-dark/20 hover:bg-yellow-light-3";
      case "DRAFT":
        return "bg-gray-2 text-dark-3 border border-gray-3 hover:bg-gray-3";
      case "SCHEDULED":
        return "bg-blue-light-5 text-blue border border-blue/20 hover:bg-blue-light-4";
      default:
        return "bg-gray-2 text-dark-3 border border-gray-3 hover:bg-gray-3";
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-7.5">
      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
          <div>
            <h3 className="text-custom-lg font-semibold text-dark">
              Products Catalog
            </h3>
            <p className="text-custom-xs text-body">
              {totalProducts} total products
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search products..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="h-8 w-64 pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-body pointer-events-none"
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
              {(["all", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                      statusFilter === filter
                        ? "bg-gray-2 text-blue shadow-1"
                        : "text-body hover:text-dark"
                    }`}
                  >
                    {filter === "all"
                      ? "All"
                      : filter === "OUT_OF_STOCK"
                        ? "Out of Stock"
                        : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                )
              )}
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>

                {categories
                  .filter((category) => !category.parentId)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name} (Main)
                    </SelectItem>
                  ))}

                {categories.some((category) => category.parentId) && (
                  <SelectItem value="divider" disabled>
                    ────────
                  </SelectItem>
                )}

                {categories
                  .filter((category) => category.parentId)
                  .map((category) => {
                    const parent = categories.find(
                      (c) => c.id === category.parentId
                    );
                    return (
                      <SelectItem key={category.id} value={category.slug}>
                        {parent
                          ? `${parent.name} › ${category.name}`
                          : category.name}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setIsAddProductDialogOpen(true)}
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
              Add Product
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px] md:min-w-[900px]">
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr_168px] gap-4 border-b border-gray-3 px-5 py-3 text-custom-xs uppercase text-body tracking-wide">
              <span>Product</span>
              <span>Category / Brand</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Modified</span>
              <span>Actions</span>
            </div>

            {isLoading ? (
              <div className="px-5 py-10 text-center text-custom-sm text-body">
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="px-5 py-10 text-center text-custom-sm text-body">
                No products found. Create your first product to get started.
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr_168px] gap-4 px-5 py-4 text-custom-sm border-b border-gray-2 last:border-0 items-center hover:bg-gray-1 transition"
                >
                  <div>
                    <p className="font-medium text-dark">{product.title}</p>
                    <p className="text-custom-xs text-body line-clamp-1">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    {product.category ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-custom-sm text-dark font-medium">
                          {product.category.name}
                        </span>
                        {product.brandId && product.brand && (
                          <span className="text-custom-xs text-body">
                            → {product.brand.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-custom-xs text-body">Unassigned</p>
                    )}
                  </div>

                  <div>
                    {product.discountedPrice ? (
                      <>
                        <p className="font-medium text-blue">
                          Rs {product.discountedPrice}{" "}
                          <span className="text-custom-xs text-body">
                            {getUnitLabel(product.unitType)}
                          </span>
                        </p>
                        <p className="text-custom-xs text-body line-through">
                          Rs {product.price}
                        </p>
                      </>
                    ) : (
                      <p className="font-medium">
                        Rs {product.price}{" "}
                        <span className="text-custom-xs text-body">
                          {getUnitLabel(product.unitType)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="font-medium">{product.stock}</p>
                  </div>

                  <div className="flex items-center">
                    <button
                      onClick={() => handleStatusChange(product)}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-custom-xs font-medium capitalize transition items-center gap-1 group min-h-[24px] ${statusPill(
                        product.status
                      )}`}
                      title="Click to change status"
                    >
                      <span>{product.status}</span>
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
                    </button>
                  </div>

                  <div>
                    <p className="text-custom-xs text-dark font-medium">
                      {new Date(product.updatedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-custom-xs text-body">
                      {new Date(product.updatedAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Add Stock */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStockIncrement(product)}
                      className="h-8 w-8 text-green hover:text-green-dark hover:bg-green-light-6 transition"
                      title="Add Stock"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 4V16M4 10H16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </Button>

                    {/* Remove Stock */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStockDecrement(product)}
                      className="h-8 w-8 text-yellow-dark hover:text-yellow hover:bg-yellow-light-4 transition"
                      title="Remove Stock"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M4 10H16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </Button>

                    {/* View */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(product.id)}
                      className="h-8 w-8 text-blue hover:text-blue-dark hover:bg-blue-light-6 transition"
                      title="View Details"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 4.16667C5.83333 4.16667 2.27499 6.73333 0.833328 10.4167C2.27499 14.1 5.83333 16.6667 10 16.6667C14.1667 16.6667 17.725 14.1 19.1667 10.4167C17.725 6.73333 14.1667 4.16667 10 4.16667Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10 13.3333C11.841 13.3333 13.3333 11.841 13.3333 10C13.3333 8.15905 11.841 6.66667 10 6.66667C8.15905 6.66667 6.66667 8.15905 6.66667 10C6.66667 11.841 8.15905 13.3333 10 13.3333Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>

                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(product.id)}
                      className="h-8 w-8 text-blue hover:text-blue-dark hover:bg-blue-light-6 transition"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M14.166 2.5C14.3849 2.28113 14.6447 2.10752 14.9307 1.98906C15.2167 1.87061 15.5232 1.80957 15.8327 1.80957C16.1422 1.80957 16.4487 1.87061 16.7347 1.98906C17.0206 2.10752 17.2805 2.28113 17.4993 2.5C17.7182 2.71887 17.8918 2.97871 18.0103 3.26468C18.1287 3.55064 18.1898 3.85714 18.1898 4.16667C18.1898 4.47619 18.1287 4.78269 18.0103 5.06866C17.8918 5.35462 17.7182 5.61446 17.4993 5.83333L6.24935 17.0833L1.66602 18.3333L2.91602 13.75L14.166 2.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>

                    {/* Duplicate */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateClick(product)}
                      className="h-8 w-8 text-body hover:text-dark hover:bg-gray-2 transition"
                      title="Duplicate Product"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <rect
                          x="7"
                          y="7"
                          width="10"
                          height="10"
                          rx="1.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M13 7V4.5C13 3.67 12.33 3 11.5 3H4.5C3.67 3 3 3.67 3 4.5V11.5C3 12.33 3.67 13 4.5 13H7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(product)}
                      className="h-8 w-8 text-red hover:text-red-dark hover:bg-red-light-6 transition"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
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
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalProducts}
            itemsPerPage={limit}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={handleLimitChange}
            showItemsPerPage={true}
            itemsPerPageOptions={[6, 12, 24, 48, 96]}
          />
        )}
      </div>

      <AddProductDialog
        isOpen={isAddProductDialogOpen}
        onClose={() => {
          setIsAddProductDialogOpen(false);
          setDuplicateSourceProduct(null);
        }}
        onSuccess={handleProductsChanged}
        prefillData={duplicatePrefill}
      />

      <EditProductDialog
        isOpen={isEditProductDialogOpen}
        onClose={() => {
          setIsEditProductDialogOpen(false);
          setSelectedProductId(null);
        }}
        onSuccess={handleProductsChanged}
        productId={selectedProductId}
      />

      <ProductDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false);
          setSelectedProductId(null);
        }}
        productId={selectedProductId}
      />

      <DeleteAlertDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        itemName={productToDelete?.title}
        isDeleting={isDeleting}
      />

      <StockDialog
        isOpen={stockDialogOpen}
        onClose={() => {
          setStockDialogOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleProductsChanged}
        productId={selectedProduct?.id || null}
        productName={selectedProduct?.title || ""}
        currentStock={selectedProduct?.stock || 0}
        type={stockDialogType}
      />

      <StatusDialog
        isOpen={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={handleProductsChanged}
        productId={selectedProduct?.id || null}
        productName={selectedProduct?.title || ""}
        currentStatus={selectedProduct?.status || "ACTIVE"}
      />
    </div>
  );
};

export default ProductsTab;
