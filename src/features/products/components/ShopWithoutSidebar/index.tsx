"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutGrid,
  PackageSearch,
  Rows3,
  SlidersHorizontal,
  X,
} from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
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


  const viewButton = (style: string) =>
    `inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
      productStyle === style
        ? "border-blue bg-blue text-gray-1"
        : "border-gray-3 bg-gray-1 text-dark hover:border-blue hover:text-blue"
    }`;

  return (
    <>
      <PageHero
        eyebrow={normalizedSearch ? "Search results" : "The collection"}
        title={
          normalizedSearch
            ? `Results for “${normalizedSearch}”`
            : (parentCategory?.name ?? "Explore all eyewear")
        }
        description={
          parentCategory?.name
            ? `Every ${parentCategory.name.toLowerCase()} we currently stock, with lens and bridge measurements on each listing.`
            : "Prescription frames, sunglasses and contact lenses — sorted however you like."
        }
        crumbs={[
          { label: "Shop", href: "/shop-with-sidebar" },
          { label: parentCategory?.name ?? normalizedSearch ?? "All products" },
        ]}
      />

      <section className="relative overflow-hidden bg-gray-1 pb-16 pt-8">
        <SiteContainer>
          {error && (
            <div className="mb-5 rounded-2xl border border-red/30 bg-red/10 px-5 py-4 text-[14px] text-red">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {brands.length > 0 && (
              <aside className="hidden w-full lg:sticky lg:top-32 lg:block lg:w-[300px] lg:self-start">
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
              <div className="mb-6 rounded-2xl border border-gray-3 bg-gray-2 p-3 shadow-2 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3">
                    {brands.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setProductSidebar(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-3 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue lg:hidden"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        Brands
                      </button>
                    )}

                    <CustomSelect
                      options={options}
                      value={sortBy}
                      onChange={setSortBy}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="hidden text-[13px] text-dark-4 sm:block">
                      <span className="font-semibold text-dark">
                        {data.products.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-dark">
                        {data.pagination?.total || 0}
                      </span>{" "}
                      products
                    </p>

                    <div className="hidden items-center gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => setProductStyle("grid")}
                        aria-label="Grid view"
                        aria-pressed={productStyle === "grid"}
                        className={viewButton("grid")}
                      >
                        <LayoutGrid className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductStyle("list")}
                        aria-label="List view"
                        aria-pressed={productStyle === "list"}
                        className={viewButton("list")}
                      >
                        <Rows3 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-center text-[13px] text-dark-4 sm:hidden">
                  <span className="font-semibold text-dark">
                    {data.products.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-dark">
                    {data.pagination?.total || 0}
                  </span>{" "}
                  products
                </p>
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
                      ? `grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 ${
                          brands.length > 0
                            ? "lg:grid-cols-3"
                            : "lg:grid-cols-3 xl:grid-cols-4"
                        }`
                      : "flex flex-col gap-4"
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
                <EmptyState
                  icon={<PackageSearch className="h-7 w-7" />}
                  title={
                    normalizedSearch
                      ? `Nothing matches “${normalizedSearch}”`
                      : "No products here yet"
                  }
                  description="Try a different search term or browse the full range — we restock every week."
                  action={{
                    label: "Browse all frames",
                    href: "/shop-with-sidebar",
                  }}
                />
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
            className={`sidebar-content fixed left-0 top-0 z-50 h-full w-full max-w-[320px] overflow-y-auto bg-gray-1 px-4 py-6 shadow-4 transition-transform duration-200 lg:hidden ${
              productSidebar ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[13.5px] font-bold uppercase tracking-[0.1em] text-dark">
                <SlidersHorizontal className="h-4 w-4 text-blue" />
                Brands
              </p>
              <button
                type="button"
                onClick={() => setProductSidebar(false)}
                aria-label="Close filters"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue"
              >
                <X className="h-4 w-4" />
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
    <div className="rounded-2xl border border-gray-3 bg-gray-2 shadow-2">
      <div className="flex items-center justify-between gap-3 border-b border-gray-3 px-5 py-4">
        <div>
          <p className="text-[13.5px] font-bold uppercase tracking-[0.1em] text-dark">
            Brands
          </p>
          {parentName && (
            <p className="mt-1 text-[11.5px] capitalize text-dark-5">
              within {parentName}
            </p>
          )}
        </div>
        {selectedBrandies.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-semibold text-blue transition-opacity hover:opacity-80"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3">
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
    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-[13px] transition-colors hover:bg-gray-8 ${
      isSelected ? "bg-blue/[0.08]" : ""
    }`}
  >
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
          isSelected ? "border-blue bg-blue" : "border-gray-4 bg-gray-1"
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
            stroke="#0A0A0A"
            strokeWidth="1.94437"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span
        className={`capitalize ${isSelected ? "font-semibold text-blue" : "text-body"}`}
      >
        {label}
      </span>
    </span>

    <span className="text-[11px] font-medium text-dark-5">{count}</span>
  </button>
);

export default ShopWithoutSidebar;
