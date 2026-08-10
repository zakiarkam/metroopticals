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
  const normalizedSubcategories = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const values = params.getAll("subcategories");
    const single = params.get("subcategory");
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

  const effectiveCategory = normalizedSubcategories.length
    ? undefined
    : normalizedCategory;

  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    normalizedSubcategories
  );

  useEffect(() => {
    setSelectedSubcategories(normalizedSubcategories);
  }, [normalizedSubcategories]);

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

  const { parentCategory, subcategories } = useMemo(() => {
    if (!normalizedCategory) {
      return { parentCategory: undefined, subcategories: [] };
    }

    const parent = categories.find(
      (category) => category.slug === normalizedCategory
    );

    const children = parent
      ? categories.filter((category) => category.parentId === parent.id)
      : [];

    return { parentCategory: parent, subcategories: children };
  }, [categories, normalizedCategory]);

  const handleSubcategoryToggle = (slug: string) => {
    const allSubcategorySlugs = subcategories.map((item) => item.slug);
    const isAllSelected =
      !!normalizedCategory && selectedSubcategories.length === 0;

    if (normalizedCategory && isAllSelected) {
      const nextSelection = allSubcategorySlugs.filter((item) => item !== slug);
      setSelectedSubcategories(nextSelection);

      updateParams({
        page: 1,
        category: undefined,
        search: normalizedSearch,
        subcategories: nextSelection.length ? nextSelection : undefined,
      });
      setCurrentPage(1);

      const params = new URLSearchParams(searchParams.toString());
      if (normalizedCategory) {
        params.set("category", normalizedCategory);
      }
      if (nextSelection.length) {
        params.set("subcategories", nextSelection.join(","));
      } else {
        params.delete("subcategories");
      }
      params.delete("subcategory");

      const queryString = params.toString();
      router.push(
        `/shop-without-sidebar${queryString ? `?${queryString}` : ""}`
      );
      setProductSidebar(false);
      return;
    }

    const nextSelectionSet = new Set(selectedSubcategories);

    if (nextSelectionSet.has(slug)) {
      nextSelectionSet.delete(slug);
    } else {
      nextSelectionSet.add(slug);
    }

    const nextSelection = Array.from(nextSelectionSet);
    const shouldUseParent =
      normalizedCategory && nextSelection.length === allSubcategorySlugs.length;

    setSelectedSubcategories(shouldUseParent ? [] : nextSelection);

    updateParams({
      page: 1,
      category: shouldUseParent ? normalizedCategory : undefined,
      search: normalizedSearch,
      subcategories:
        shouldUseParent || nextSelection.length === 0
          ? undefined
          : nextSelection,
    });
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (shouldUseParent) {
      params.set("category", normalizedCategory ?? "");
      params.delete("subcategories");
    } else {
      if (normalizedCategory) {
        params.set("category", normalizedCategory);
      } else {
        params.delete("category");
      }
      if (nextSelection.length) {
        params.set("subcategories", nextSelection.join(","));
      } else {
        params.delete("subcategories");
      }
    }

    params.delete("subcategory");

    const queryString = params.toString();
    router.push(`/shop-without-sidebar${queryString ? `?${queryString}` : ""}`);
    setProductSidebar(false);
  };

  const handleSubcategoryClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subcategories");
    params.delete("subcategory");
    const queryString = params.toString();

    setSelectedSubcategories([]);
    updateParams({
      page: 1,
      category: normalizedCategory,
      search: normalizedSearch,
      subcategories: undefined,
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
    ...(normalizedSubcategories.length
      ? { subcategories: normalizedSubcategories }
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
      subcategories: normalizedSubcategories.length
        ? normalizedSubcategories
        : undefined,
    });
  }, [
    effectiveCategory,
    normalizedSearch,
    normalizedSubcategories,
    updateParams,
  ]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  return (
    <>
      {/* <Breadcrumb title={"Explore All Products"} pages={["Shop"]} /> */}
      <section className="overflow-hidden relative py-8 bg-[#f3f4f6]">
        <SiteContainer>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-7.5">
            {subcategories.length > 0 && (
              <aside className="hidden lg:block w-full lg:w-[310px] lg:sticky lg:top-28 lg:self-start">
                <SubcategoryFilter
                  parentName={parentCategory?.name}
                  subcategories={subcategories}
                  selectedSubcategories={selectedSubcategories}
                  isParentSelected={!!normalizedCategory}
                  onToggle={handleSubcategoryToggle}
                  onClear={handleSubcategoryClear}
                />
              </aside>
            )}
            <div className="w-full lg:flex-1">
              <div className="rounded-lg bg-white shadow-1 pl-3 pr-2.5 py-2.5 mb-6">
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
                  columns={subcategories.length > 0 ? 3 : 4}
                />
              )}

              {/* Products Grid/List */}
              {!loading && data.products.length > 0 && (
                <div
                  className={`${
                    productStyle === "grid"
                      ? `grid grid-cols-1 sm:grid-cols-2 ${
                          subcategories.length > 0
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

      {subcategories.length > 0 && (
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
            className={`sidebar-content fixed top-0 left-0 z-50 h-full w-full max-w-[310px] bg-white px-5 py-6 shadow-1 overflow-y-auto transition-transform duration-200 xl:hidden ${
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

            <SubcategoryFilter
              parentName={parentCategory?.name}
              subcategories={subcategories}
              selectedSubcategories={selectedSubcategories}
              isParentSelected={!!normalizedCategory}
              onToggle={handleSubcategoryToggle}
              onClear={handleSubcategoryClear}
            />
          </div>
        </>
      )}
    </>
  );
};

const getCategoryProductCount = (category: Category) =>
  category.productCount ?? category._count?.products ?? 0;

interface SubcategoryFilterProps {
  parentName?: string;
  subcategories: Category[];
  selectedSubcategories: string[];
  isParentSelected: boolean;
  onToggle: (slug: string) => void;
  onClear: () => void;
}

interface SubcategoryButtonProps {
  label: string;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
}

const SubcategoryFilter = ({
  parentName,
  subcategories,
  selectedSubcategories,
  isParentSelected,
  onToggle,
  onClear,
}: SubcategoryFilterProps) => {
  const isAllSelected = isParentSelected && selectedSubcategories.length === 0;

  return (
    <div className="bg-white shadow-1 rounded-lg mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-2">
        <div>
          <p className="text-dark font-semibold">Subcategories</p>
          {parentName && (
            <p className="text-custom-xs text-body">Options for {parentName}</p>
          )}
        </div>
        {selectedSubcategories.length > 0 && (
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
        <SubcategoryButton
          label="All subcategories"
          count={subcategories.reduce(
            (total, category) => total + getCategoryProductCount(category),
            0
          )}
          isSelected={isAllSelected || selectedSubcategories.length === 0}
          onSelect={onClear}
        />

        {subcategories.map((subcategory) => (
          <SubcategoryButton
            key={subcategory.id}
            label={subcategory.name}
            count={getCategoryProductCount(subcategory)}
            isSelected={
              isAllSelected || selectedSubcategories.includes(subcategory.slug)
            }
            onSelect={() => onToggle(subcategory.slug)}
          />
        ))}
      </div>
    </div>
  );
};

const SubcategoryButton = ({
  label,
  count,
  isSelected,
  onSelect,
}: SubcategoryButtonProps) => (
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
          isSelected ? "border-blue bg-blue" : "bg-white border-gray-3"
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
