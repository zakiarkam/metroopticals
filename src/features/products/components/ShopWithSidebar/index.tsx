"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SiteContainer from "@/components/common/SiteContainer";
import CustomSelect from "./CustomSelect";
import CategoryDropdown from "./CategoryDropdown";
import PriceDropdown from "./PriceDropdown";
import type { ProductFacets } from "@/features/products/types/product";
import ShopFilters, {
  EMPTY_SELECTION,
  useFacets,
  type FilterSelection,
} from "./ShopFilters";
import SingleGridItem from "../Shop/SingleGridItem";
import SingleListItem from "../Shop/SingleListItem";
import { useProducts } from "@/features/products/hooks/use-products";
import { useCategories } from "@/features/categories/hooks/use-categories";
import ShopSkeleton, { ProductsLoadingSkeleton } from "./ShopSkeleton";
import Pagination from "@/components/ui/pagination";

const PRICE_MIN = 0;
const PRICE_MAX = 100000;

type ProductStyle = "grid" | "list";

const sortOptions = [
  { label: "Latest Products", value: "createdAt" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Title: A-Z", value: "title-asc" },
];

function useThrottledScroll(
  throttleMs: number,
  onChange: (scrollY: number) => void
) {
  const ticking = useRef(false);

  useEffect(() => {
    const handler = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.setTimeout(() => {
        ticking.current = false;
        onChange(window.scrollY);
      }, throttleMs);
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [throttleMs, onChange]);
}

const ShopToolbar = React.memo(function ShopToolbar({
  productStyle,
  setProductStyle,
  sortBy,
  setSortBy,
  total,
  showing,
  onOpenFilters,
  showFiltersButton,
}: {
  productStyle: ProductStyle;
  setProductStyle: (v: ProductStyle) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  total?: number;
  showing: number;
  onOpenFilters: () => void;
  showFiltersButton: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-2 shadow-sm px-3 py-3 mb-6 border border-gray-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
          {showFiltersButton && (
            <button
              onClick={onOpenFilters}
              className="sm:hidden inline-flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2.25 4.5H15.75M2.25 9H15.75M2.25 13.5H15.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Filters
            </button>
          )}

          <CustomSelect
            options={sortOptions}
            value={sortBy}
            onChange={setSortBy}
          />

          <p className="hidden sm:block text-sm text-body ">
            Showing{" "}
            <span className="text-dark  font-medium">
              {showing} of {total ?? showing}
            </span>{" "}
            Products
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2.5">
          {showFiltersButton && (
            <button
              onClick={onOpenFilters}
              className="xl:hidden inline-flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2.25 4.5H15.75M2.25 9H15.75M2.25 13.5H15.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Filters
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setProductStyle("grid")}
              aria-label="Grid view"
              className={`${
                productStyle === "grid"
                  ? "bg-blue border-blue text-white"
                  : "text-dark bg-gray-1 border-gray-3"
              } flex items-center justify-center w-10.5 h-9 rounded-[6px] border ease-out duration-200 hover:bg-blue hover:border-blue hover:text-white`}
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
              aria-label="List view"
              className={`${
                productStyle === "list"
                  ? "bg-blue border-blue text-white"
                  : "text-dark bg-gray-1 border-gray-3"
              } flex items-center justify-center w-10.5 h-9 rounded-[6px] border ease-out duration-200 hover:bg-blue hover:border-blue hover:text-white`}
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

      <div className="flex justify-center sm:hidden mt-3 text-sm text-body">
        Showing{" "}
        <span className="text-dark font-medium">
          {showing} of {total ?? showing}
        </span>{" "}
        Products
      </div>
    </div>
  );
});

const ShopSidebar = React.memo(function ShopSidebar({
  open,
  onClose,
  stickyOffset,
  searchTerm,
  setSearchTerm,
  selectedCategories,
  setSelectedCategories,
  categories,
  categoriesLoading,
  priceRange,
  setPriceRange,
  onClearAll,
  facets,
  facetsLoading,
  filterSelection,
  onFilterChange,
  onClearFilters,
}: {
  open: boolean;
  onClose: () => void;
  stickyOffset: number;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  categories: any[];
  categoriesLoading: boolean;
  priceRange: { from: number; to: number };
  setPriceRange: (v: { from: number; to: number }) => void;
  onClearAll: () => void;
  facets: ProductFacets | null;
  facetsLoading: boolean;
  filterSelection: FilterSelection;
  onFilterChange: (next: FilterSelection) => void;
  onClearFilters: () => void;
}) {
  return (
    <div
      className={`sidebar-content fixed xl:z-1 z-[9999] left-0 top-0 xl:translate-x-0 xl:static xl:w-[320px] xl:flex-shrink-0 w-full ease-out duration-200 ${
        open
          ? "translate-x-0 bg-gray-2 p-4 h-screen overflow-y-auto"
          : "-translate-x-full"
      }`}
      style={{ paddingTop: open ? stickyOffset : undefined }}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <div className="bg-gray-2 shadow-sm mt-4 xl:mt-0 rounded-xl py-3 px-4 border border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex  items-center gap-2">
                <p className="text-sm font-medium text-dark">Filters : </p>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-blue text-sm hover:underline"
                >
                  Clear All
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="xl:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="bg-gray-2 shadow-sm rounded-xl py-3 px-4 border border-gray-100">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue"
            />
          </div>

          {!categoriesLoading && (
            <CategoryDropdown
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
            />
          )}

          <ShopFilters
            facets={facets}
            loading={facetsLoading}
            selection={filterSelection}
            onChange={onFilterChange}
            onClearAll={onClearFilters}
            priceSlot={
              <PriceDropdown
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                minPrice={PRICE_MIN}
                maxPrice={PRICE_MAX}
                embedded
              />
            }
          />
        </div>
      </form>
    </div>
  );
});

export default function ShopWithSidebar() {
  const [productStyle, setProductStyle] = useState<ProductStyle>("grid");
  const [productSidebar, setProductSidebar] = useState(false);
  const [stickyMenu, setStickyMenu] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({
    from: PRICE_MIN,
    to: PRICE_MAX,
  });
  const [sortBy, setSortBy] = useState("createdAt");
  const [currentPage, setCurrentPage] = useState(1);

  /** Attribute filters (gender, brand, size, shape, colour, material, rim). */
  const [filterSelection, setFilterSelection] =
    useState<FilterSelection>(EMPTY_SELECTION);

  const handleClearAttributeFilters = useCallback(
    () => setFilterSelection(EMPTY_SELECTION),
    []
  );

  const priceEffectFirstRun = useRef(true);
  const searchEffectFirstRun = useRef(true);
  const prevSelectedCategoriesRef = useRef<string[]>([]);
  const pageEffectFirstRun = useRef(true);

  const { data, loading, error, updateParams } = useProducts({
    page: 1,
    limit: 12,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { categories, loading: categoriesLoading } = useCategories();

  // Facet counts follow the category scope, not the ticked attribute filters.
  const { facets, loading: facetsLoading } = useFacets(
    selectedCategories[0],
    searchTerm || undefined
  );

  // Push attribute filters into the product query whenever they change.
  const filterKey = JSON.stringify(filterSelection);
  useEffect(() => {
    const asParams = Object.fromEntries(
      Object.entries(filterSelection).map(([k, v]) => [
        k,
        v.length ? v : undefined,
      ])
    );
    setCurrentPage(1);
    updateParams({ page: 1, ...asParams });
    // filterKey captures deep changes; updateParams is stable.
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ throttled sticky state updates (prevents scroll re-render spam)
  useThrottledScroll(
    120,
    useCallback((y) => setStickyMenu(y >= 80), [])
  );

  // ✅ close sidebar by click outside (only when open)
  useEffect(() => {
    if (!productSidebar) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".sidebar-content"))
        setProductSidebar(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [productSidebar]);

  // ✅ enforce grid on small screens (no layout glitches)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 650px)");
    const handleChange = () => {
      if (mediaQuery.matches) setProductStyle("grid");
    };
    handleChange();
    mediaQuery.addEventListener?.("change", handleChange);

    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleChange);

      mediaQuery.removeListener?.(handleChange);
    };
  }, []);

  // ✅ debounce search (your logic kept)
  useEffect(() => {
    if (searchEffectFirstRun.current) {
      searchEffectFirstRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const trimmed = searchTerm.trim();
      updateParams({ search: trimmed || undefined, page: 1 });
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, updateParams]);

  // ✅ categories -> parent/brands mapping (your logic kept)
  useEffect(() => {
    const hasSelection = selectedCategories.length > 0;
    const hadSelection = prevSelectedCategoriesRef.current.length > 0;
    if (!hasSelection && !hadSelection) {
      prevSelectedCategoriesRef.current = selectedCategories;
      return;
    }

    const parentSlugs: string[] = [];
    const childSlugs: string[] = [];

    selectedCategories.forEach((slug) => {
      const category = categories.find((cat) => cat.slug === slug);
      if (category?.parentId) childSlugs.push(slug);
      else parentSlugs.push(slug);
    });

    updateParams({
      categories: parentSlugs.length ? parentSlugs : undefined,
      brands: childSlugs.length ? childSlugs : undefined,
      page: 1,
    });

    setCurrentPage(1);
    prevSelectedCategoriesRef.current = selectedCategories;
  }, [selectedCategories, categories, updateParams]);

  // ✅ debounce price range (your logic kept)
  useEffect(() => {
    if (priceEffectFirstRun.current) {
      priceEffectFirstRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const payload =
        priceRange.from === PRICE_MIN && priceRange.to === PRICE_MAX
          ? { minPrice: undefined, maxPrice: undefined }
          : { minPrice: priceRange.from, maxPrice: priceRange.to };

      updateParams({ ...payload, page: 1 });
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [priceRange.from, priceRange.to, updateParams]);

  // ✅ sort mapping (your logic kept)
  useEffect(() => {
    const sortMap: Record<string, "createdAt" | "price" | "title"> = {
      createdAt: "createdAt",
      price: "price",
      title: "title",
    };
    const [field, order] = sortBy.includes("-")
      ? sortBy.split("-")
      : [sortBy, "desc"];
    updateParams({
      sortBy: sortMap[field],
      sortOrder: order as "asc" | "desc",
    });
  }, [sortBy, updateParams]);

  // ✅ pagination updates (your logic kept)
  useEffect(() => {
    if (pageEffectFirstRun.current) {
      pageEffectFirstRun.current = false;
      return;
    }
    updateParams({ page: currentPage });
  }, [currentPage, updateParams]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCategories([]);
    setPriceRange({ from: PRICE_MIN, to: PRICE_MAX });
    setSortBy("createdAt");
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const total = data.pagination?.total;
  const showing = data.products?.length ?? 0;

  // ✅ sticky offset for mobile filters header spacing
  const stickyOffset = stickyMenu ? 16 : 0;

  return (
    <section className="overflow-hidden relative pb-8 pt-4 lg:pt-8 xl:pt-8 bg-gray-1">
      <SiteContainer>
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 xl:flex-row">
          <ShopSidebar
            open={productSidebar}
            onClose={() => setProductSidebar(false)}
            stickyOffset={stickyOffset}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            categories={categories}
            categoriesLoading={categoriesLoading}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onClearAll={handleClearFilters}
            facets={facets}
            facetsLoading={facetsLoading}
            filterSelection={filterSelection}
            onFilterChange={setFilterSelection}
            onClearFilters={handleClearAttributeFilters}
          />

          <div className="flex-1 w-full">
            <ShopToolbar
              productStyle={productStyle}
              setProductStyle={setProductStyle}
              sortBy={sortBy}
              setSortBy={setSortBy}
              total={total}
              showing={showing}
              onOpenFilters={() => setProductSidebar((v) => !v)}
              showFiltersButton
            />

            {loading && (
              <ProductsLoadingSkeleton
                variant={productStyle}
                count={12}
                columns={3}
              />
            )}

            {!loading && data.products.length > 0 && (
              <div
                className={
                  productStyle === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8"
                    : "flex flex-col gap-6"
                }
              >
                {data.products.map((item, idx) =>
                  productStyle === "grid" ? (
                    <SingleGridItem item={item} key={item.id ?? idx} />
                  ) : (
                    <SingleListItem item={item} key={item.id ?? idx} />
                  )
                )}
              </div>
            )}

            {!loading && data.products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
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
                  Try adjusting your filters or search terms
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-blue text-white rounded-lg hover:bg-blue-dark"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {!loading && (data.pagination?.totalPages ?? 1) > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={data.pagination!.totalPages}
                totalItems={total ?? 0}
                itemsPerPage={data.pagination?.limit ?? 12}
                onPageChange={handlePageChange}
                showItemsPerPage={false}
              />
            )}
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
