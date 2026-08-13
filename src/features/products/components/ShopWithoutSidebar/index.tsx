"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Breadcrumb from "@/components/common/Breadcrumb";
import SiteContainer from "@/components/common/SiteContainer";
import SingleGridItem from "../Shop/SingleGridItem";
import SingleListItem from "../Shop/SingleListItem";
import CustomSelect from "../ShopWithSidebar/CustomSelect";
import { ProductsLoadingSkeleton } from "../ShopWithSidebar/ShopSkeleton";
import { useProducts } from "@/features/products/hooks/use-products";
import { useRouter, useSearchParams } from "next/navigation";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { Category } from "@/features/categories/types/category";
import Pagination from "@/components/ui/pagination";

const ShopWithoutSidebar = () => {
  const [productStyle, setProductStyle] = useState("grid");
  const [sortBy, setSortBy] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const [productSidebar, setProductSidebar] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { categories } = useCategories();
  const categoryFilter = searchParams.get("category") || undefined;
  const searchFilter = searchParams.get("search") || undefined;
  const normalizedCategory =
    categoryFilter && categoryFilter.trim().length > 0
      ? categoryFilter
      : undefined;
  const normalizedSearch =
    searchFilter && searchFilter.trim().length > 0
      ? searchFilter.trim()
      : undefined;
  const searchParamsString = searchParams.toString();
  const normalizedBrandies = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const values = params.getAll("brands");
    const single = params.get("brand");
    const allValues = [...values];
    if (single) {
      allValues.push(single);
    }

    const sanitized = allValues
      .flatMap((value) =>
        value
          .split(",")
          .map((slug) => slug.trim())
          .filter((slug) => slug.length > 0)
      )
      .filter(Boolean);

    return Array.from(new Set(sanitized));
  }, [searchParamsString]);

  const effectiveCategory = normalizedBrandies.length
    ? undefined
    : normalizedCategory;

  const [selectedBrandies, setSelectedBrandies] = useState<string[]>(
    normalizedBrandies
  );

  useEffect(() => {
    setSelectedBrandies(normalizedBrandies);
  }, [normalizedBrandies]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 650px)");
    const handleChange = () => {
      if (mediaQuery.matches) {
        setProductStyle("grid");
      }
    };
    handleChange();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.addEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const { parentCategory, brands } = useMemo(() => {
    if (!normalizedCategory) {
      return { parentCategory: undefined, brands: [] };
    }

    const parent = categories.find(
      (category) => category.slug === normalizedCategory
    );

    const children = parent
      ? categories.filter((category) => category.parentId === parent.id)
      : [];

    return { parentCategory: parent, brands: children };
  }, [categories, normalizedCategory]);

  const handleBrandyToggle = (slug: string) => {
    const allBrandySlugs = brands.map((item) => item.slug);
    const isAllSelected =
      !!normalizedCategory && selectedBrandies.length === 0;

    if (normalizedCategory && isAllSelected) {
      const nextSelection = allBrandySlugs.filter((item) => item !== slug);
      setSelectedBrandies(nextSelection);

      updateParams({
        page: 1,
        category: undefined,
        search: normalizedSearch,
        brands: nextSelection.length ? nextSelection : undefined,
      });
      setCurrentPage(1);

      const params = new URLSearchParams(searchParams.toString());
      if (normalizedCategory) {
        params.set("category", normalizedCategory);
      }
      if (nextSelection.length) {
        params.set("brands", nextSelection.join(","));
      } else {
        params.delete("brands");
      }
      params.delete("brand");

      const queryString = params.toString();
      router.push(
        `/shop-without-sidebar${queryString ? `?${queryString}` : ""}`
      );
      setProductSidebar(false);
      return;
    }

    const nextSelectionSet = new Set(selectedBrandies);

    if (nextSelectionSet.has(slug)) {
      nextSelectionSet.delete(slug);
    } else {
      nextSelectionSet.add(slug);
    }

    const nextSelection = Array.from(nextSelectionSet);
    const shouldUseParent =
      normalizedCategory && nextSelection.length === allBrandySlugs.length;

    setSelectedBrandies(shouldUseParent ? [] : nextSelection);

    updateParams({
      page: 1,
      category: shouldUseParent ? normalizedCategory : undefined,
      search: normalizedSearch,
      brands:
        shouldUseParent || nextSelection.length === 0
          ? undefined
          : nextSelection,
    });
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (shouldUseParent) {
      params.set("category", normalizedCategory ?? "");
      params.delete("brands");
    } else {
      if (normalizedCategory) {
        params.set("category", normalizedCategory);
      } else {
        params.delete("category");
      }
      if (nextSelection.length) {
        params.set("brands", nextSelection.join(","));
      } else {
        params.delete("brands");
      }
    }

    params.delete("brand");

    const queryString = params.toString();
    router.push(`/shop-without-sidebar${queryString ? `?${queryString}` : ""}`);
    setProductSidebar(false);
  };

  const handleBrandyClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("brands");
    params.delete("brand");
    const queryString = params.toString();

    setSelectedBrandies([]);
    updateParams({
      page: 1,
      category: normalizedCategory,
      search: normalizedSearch,
      brands: undefined,
    });
    setCurrentPage(1);

    router.push(`/shop-without-sidebar${queryString ? `?${queryString}` : ""}`);
    setProductSidebar(false);
  };

  const { data, loading, error, updateParams } = useProducts({
    page: 1,
    limit: 16,
    ...(effectiveCategory ? { category: effectiveCategory } : {}),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(normalizedBrandies.length
      ? { brands: normalizedBrandies }
      : {}),
  });

  const options = [
    { label: "Latest Products", value: "createdAt" },
    { label: "Price: Low to High", value: "price-asc" },
    { label: "Price: High to Low", value: "price-desc" },
    { label: "Title: A-Z", value: "title-asc" },
  ];

  const sortMap = useMemo(
    () =>
      ({
        createdAt: "createdAt",
        price: "price",
        title: "title",
      }) as Record<string, "createdAt" | "price" | "title">,
    []
  );

  const handleSortChange = useCallback(() => {
    const [field, order] = sortBy.includes("-")
      ? sortBy.split("-")
      : [sortBy, "desc"];
    updateParams({
      sortBy: sortMap[field],
      sortOrder: order as "asc" | "desc",
    });
  }, [sortBy, sortMap, updateParams]);

  const handlePageUpdate = useCallback(() => {
    updateParams({ page: currentPage });
  }, [currentPage, updateParams]);

  // Update sort
  useEffect(() => {
    handleSortChange();
  }, [handleSortChange]);

  // Update page
  useEffect(() => {
    handlePageUpdate();
  }, [handlePageUpdate]);

  // Update filters when URL params change
  useEffect(() => {
    setCurrentPage(1);
    updateParams({
      page: 1,
      category: effectiveCategory,
      search: normalizedSearch,
      brands: normalizedBrandies.length
        ? normalizedBrandies
        : undefined,
    });
  }, [
    effectiveCategory,
    normalizedSearch,
    normalizedBrandies,
    updateParams,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  return (
    <>
      {/* <Breadcrumb title={"Explore All Products"} pages={["Shop"]} /> */}
      <section className="overflow-hidden relative py-8 bg-gray-1">
        <SiteContainer>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-7.5">
            {brands.length > 0 && (
              <aside className="hidden lg:block w-full lg:w-[310px] lg:sticky lg:top-28 lg:self-start">
                <BrandyFilter
                  parentName={parentCategory?.name}
                  brands={brands}
                  selectedBrandies={selectedBrandies}
                  isParentSelected={!!normalizedCategory}
                  onToggle={handleBrandyToggle}
                  onClear={handleBrandyClear}
                />
              </aside>
            )}
            <div className="w-full lg:flex-1">
              <div className="rounded-lg bg-gray-2 shadow-1 pl-3 pr-2.5 py-2.5 mb-6 border border-gray-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => setProductSidebar(true)}
                      className="sm:hidden flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg"
                      type="button"
                    >
                      <svg
                        className="fill-current"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M2.25 4.5H15.75M2.25 9H15.75M2.25 13.5H15.75"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Filters
                    </button>

                    <CustomSelect
                      options={options}
                      value={sortBy}
                      onChange={setSortBy}
                    />

                    <p className="hidden sm:block">
                      Showing{" "}
                      <span className="text-dark">
                        {data.products.length} of {data.pagination?.total || 0}
                      </span>{" "}
                      Products
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2.5">
                    <button
                      onClick={() => setProductSidebar(true)}
                      className="xl:hidden flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg"
                      type="button"
                    >
                      <svg
                        className="fill-current"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M2.25 4.5H15.75M2.25 9H15.75M2.25 13.5H15.75"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Filters
                    </button>
                    <div className="hidden sm:flex items-center gap-2.5">
                      <button
                        onClick={() => setProductStyle("grid")}
                        aria-label="button for product grid tab"
                        className={`${
                          productStyle === "grid"
                            ? "bg-blue border-blue text-white"
                            : "text-dark bg-gray-1 border-gray-3"
                        } flex items-center justify-center w-10.5 h-9 rounded-[5px] border ease-out duration-200 hover:bg-blue hover:border-blue hover:text-white`}
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                        >
                          <rect x="1" y="1" width="6" height="6" rx="1" />
                          <rect x="11" y="1" width="6" height="6" rx="1" />
                          <rect x="1" y="11" width="6" height="6" rx="1" />
                          <rect x="11" y="11" width="6" height="6" rx="1" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setProductStyle("list")}
                        aria-label="button for product list tab"
                        className={`${
                          productStyle === "list"
                            ? "bg-blue border-blue text-white"
                            : "text-dark bg-gray-1 border-gray-3"
                        } flex items-center justify-center w-10.5 h-9 rounded-[5px] border ease-out duration-200 hover:bg-blue hover:border-blue hover:text-white`}
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                        >
                          <rect x="1" y="2" width="16" height="3" rx="1" />
                          <rect x="1" y="7.5" width="16" height="3" rx="1" />
                          <rect x="1" y="13" width="16" height="3" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center sm:hidden mt-3">
                  <p>
                    Showing{" "}
                    <span className="text-dark">
                      {data.products.length} of {data.pagination?.total || 0}
                    </span>{" "}
                    Products
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <ProductsLoadingSkeleton
                  variant={productStyle as "grid" | "list"}
                  count={16}
                  columns={brands.length > 0 ? 3 : 4}
                />
              )}

              {/* Products Grid/List */}
              {!loading && data.products.length > 0 && (
                <div
                  className={`${
                    productStyle === "grid"
                      ? `grid grid-cols-1 sm:grid-cols-2 ${
                          brands.length > 0
                            ? "lg:grid-cols-3"
                            : "lg:grid-cols-4"
                        } gap-x-7.5 gap-y-9`
                      : "flex flex-col gap-7.5"
                  }`}
                >
                  {data.products.map((item, key) =>
                    productStyle === "grid" ? (
                      <SingleGridItem item={item} key={key} />
                    ) : (
                      <SingleListItem item={item} key={key} />
                    )
                  )}
                </div>
              )}

              {/* Empty State */}
              {!loading && data.products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                  <svg
                    className="w-16 h-16 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <h3 className="text-xl font-semibold text-dark mb-2">
                    No Products Found
                  </h3>
                  <p className="text-body mb-4">
                    Please check back later for new products
                  </p>
                </div>
              )}

              {/* Pagination */}
              {!loading && (data.pagination?.totalPages || 1) > 1 && (
                <div className="mt-10">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={data.pagination?.totalPages || 1}
                    totalItems={data.pagination?.total || 0}
                    itemsPerPage={data.pagination?.limit || 16}
                    onPageChange={handlePageChange}
                    showItemsPerPage={false}
                  />
                </div>
              )}
            </div>
          </div>
        </SiteContainer>
      </section>

      {brands.length > 0 && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 xl:hidden ${
              productSidebar
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            onClick={() => setProductSidebar(false)}
          />

          <div
            className={`sidebar-content fixed top-0 left-0 z-50 h-full w-full max-w-[310px] bg-gray-2 px-5 py-6 shadow-1 overflow-y-auto transition-transform duration-200 xl:hidden ${
              productSidebar ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-lg font-semibold">Filters</p>
              <button
                type="button"
                onClick={() => setProductSidebar(false)}
                className="text-blue hover:underline"
              >
                Close
              </button>
            </div>

            <BrandyFilter
              parentName={parentCategory?.name}
              brands={brands}
              selectedBrandies={selectedBrandies}
              isParentSelected={!!normalizedCategory}
              onToggle={handleBrandyToggle}
              onClear={handleBrandyClear}
            />
          </div>
        </>
      )}
    </>
  );
};

const getCategoryProductCount = (category: Category) =>
  category.productCount ?? category._count?.products ?? 0;

interface BrandyFilterProps {
  parentName?: string;
  brands: Category[];
  selectedBrandies: string[];
  isParentSelected: boolean;
  onToggle: (slug: string) => void;
  onClear: () => void;
}

interface BrandyButtonProps {
  label: string;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
}

const BrandyFilter = ({
  parentName,
  brands,
  selectedBrandies,
  isParentSelected,
  onToggle,
  onClear,
}: BrandyFilterProps) => {
  const isAllSelected = isParentSelected && selectedBrandies.length === 0;

  return (
    <div className="bg-gray-2 shadow-1 rounded-lg mb-6 border border-gray-3">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-2">
        <div>
          <p className="text-dark font-semibold">Brands</p>
          {parentName && (
            <p className="text-custom-xs text-body">Options for {parentName}</p>
          )}
        </div>
        {selectedBrandies.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-custom-xs text-blue hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 px-6 py-5">
        <BrandyButton
          label="All brands"
          count={brands.reduce(
            (total, category) => total + getCategoryProductCount(category),
            0
          )}
          isSelected={isAllSelected || selectedBrandies.length === 0}
          onSelect={onClear}
        />

        {brands.map((brand) => (
          <BrandyButton
            key={brand.id}
            label={brand.name}
            count={getCategoryProductCount(brand)}
            isSelected={
              isAllSelected || selectedBrandies.includes(brand.slug)
            }
            onSelect={() => onToggle(brand.slug)}
          />
        ))}
      </div>
    </div>
  );
};

const BrandyButton = ({
  label,
  count,
  isSelected,
  onSelect,
}: BrandyButtonProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={`${
      isSelected ? "text-blue" : "text-dark"
    } group flex items-center justify-between ease-out duration-200 hover:text-blue w-full`}
  >
    <div className="flex items-center gap-2">
      <div
        className={`cursor-pointer flex items-center justify-center rounded w-4 h-4 border ${
          isSelected ? "border-blue bg-blue" : "bg-gray-2 border-gray-3"
        }`}
      >
        <svg
          className={isSelected ? "block" : "hidden"}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.33317 2.5L3.74984 7.08333L1.6665 5"
            stroke="white"
            strokeWidth="1.94437"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <span className="text-body">{label}</span>
    </div>

    <span
      className={`${
        isSelected ? "text-white bg-blue" : "text-dark bg-gray-2"
      } inline-flex rounded-[30px] text-custom-xs px-2 ease-out duration-200`}
    >
      {count}
    </span>
  </button>
);

export default ShopWithoutSidebar;
