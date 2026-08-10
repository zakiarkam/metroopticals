"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import AddProductDialog from "@/features/products/components/admin/modals/AddProductDialog";
import { getProducts, deleteProduct, type Product } from "@/features/products/api/product-api";

type ProductsTabProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateRange: string;
};

const ProductsTab: React.FC<ProductsTabProps> = ({
  searchTerm,
  setSearchTerm,
  dateRange,
}) => {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft" | "scheduled" | "low"
  >("all");
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getProducts({ search: searchTerm });
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product. Please try again.");
    }
  };

  const summaryMetrics = useMemo(
    () => [
      {
        label: "Active listings",
        value: "326",
        helper: "+18 new this week",
        color: "bg-blue-light-5 text-blue",
      },
      {
        label: "In stock units",
        value: "9,432",
        helper: "Warehouse & dropship",
        color: "bg-green-light-6 text-green",
      },
      {
        label: "Low stock alerts",
        value: "14",
        helper: "Under safety threshold",
        color: "bg-yellow-light-4 text-yellow-dark",
      },
      {
        label: "Archived products",
        value: "46",
        helper: "Hidden from storefront",
        color: "bg-gray-2 text-dark-3",
      },
    ],
    []
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const prodStatusKey = String(product.status).toLowerCase();
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
            ? prodStatusKey === "active"
            : statusFilter === "draft"
              ? prodStatusKey === "draft"
              : statusFilter === "scheduled"
                ? prodStatusKey === "scheduled"
                : prodStatusKey.includes("low");

      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.title.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch) ||
        (product.category?.name || "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [products, searchTerm, statusFilter]);

  const rangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7":
        return "last week";
      case "30":
        return "last 30 days";
      case "90":
        return "last quarter";
      default:
        return "last 12 months";
    }
  }, [dateRange]);

  const statusPill = (status: string) => {
    const key = (status || "").toString().toLowerCase();
    switch (key) {
      case "published":
        return "bg-green-light-6 text-green";
      case "draft":
        return "bg-gray-2 text-dark-3";
      case "scheduled":
        return "bg-blue-light-5 text-blue";
      case "low stock":
      case "low":
        return "bg-yellow-light-4 text-yellow-dark";
      default:
        return "bg-gray-2 text-dark-3";
    }
  };

  return (
    <div className="space-y-7.5">
      {/* <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-gray-3 bg-white shadow-1 p-5"
          >
            <div className="flex flex-col gap-2">
              <p className="text-custom-xs uppercase text-body tracking-wide">
                {metric.label}
              </p>
              <p className="text-2xl font-semibold text-dark">{metric.value}</p>
              <span
                className={`w-fit rounded-full px-3 py-1 text-custom-xs font-medium ${metric.color}`}
              >
                {metric.helper}
              </span>
            </div>
          </div>
        ))}
      </div> */}

      <div className="rounded-xl border border-gray-3 bg-white shadow-1">
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
          <div>
            <h3 className="text-custom-lg font-semibold text-dark">
              Catalog overview
            </h3>
            <p className="text-custom-xs text-body">
              Performance and status by product - {rangeLabel}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex rounded-full border border-gray-3 bg-gray-1 p-1">
              {[
                { id: "all", label: "All" },
                { id: "published", label: "Published" },
                { id: "scheduled", label: "Scheduled" },
                { id: "low", label: "Low stock" },
                { id: "draft", label: "Draft" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() =>
                    setStatusFilter(filter.id as typeof statusFilter)
                  }
                  className={`rounded-full px-3 py-1 text-custom-xs transition ${
                    statusFilter === filter.id
                      ? "bg-white text-blue shadow-1"
                      : "text-body hover:text-dark"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-blue bg-blue px-4 py-2 text-custom-sm font-medium text-white transition hover:bg-blue-dark"
              onClick={() => setIsAddProductDialogOpen(true)}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
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
              Add product
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-gray-3 px-5 py-3 text-custom-xs uppercase text-body tracking-wide">
              <span>Product</span>
              <span>SKU Code</span>
              <span>Category</span>
              <span>Inventory</span>
              <span>Status</span>
              <span>Last update</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="px-5 py-10 text-center text-custom-sm text-body">
                No products match your filters. Try adjusting the status or
                clearing the search.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.sku}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 text-custom-sm text-dark border-b border-gray-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-dark">{product.title}</p>
                    <p className="text-custom-xs text-body">
                      Visibility: {product.status}
                    </p>
                  </div>
                  <p>{product.slug}</p>
                  <p>{product.category?.name || "Uncategorized"}</p>
                  <div>
                    <p className="font-medium">{product.stock}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-2">
                      <div
                        className="h-full rounded-full bg-blue"
                        style={{
                          width: `${Math.min(
                            (product.stock / 100) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-custom-xs font-medium capitalize ${statusPill(
                      product.status
                    )}`}
                  >
                    {product.status}
                  </span>
                  <p className="text-custom-xs text-body">
                    {new Date(product.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddProductDialog
        isOpen={isAddProductDialogOpen}
        onClose={() => setIsAddProductDialogOpen(false)}
      />
    </div>
  );
};

export default ProductsTab;
