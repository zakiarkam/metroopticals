"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutGrid,
  PackageSearch,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
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
  const viewButton = (style: ProductStyle) =>
    `inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
      productStyle === style
        ? "border-blue bg-blue text-gray-1"
        : "border-gray-3 bg-gray-1 text-dark hover:border-blue hover:text-blue"
    }`;

  return (
    <div className="mb-6 rounded-2xl border border-gray-3 bg-gray-2 p-3 shadow-2 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          {showFiltersButton && (
            <button
              type="button"
              onClick={onOpenFilters}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-3 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue xl:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          )}

          <CustomSelect
            options={sortOptions}
            value={sortBy}
            onChange={setSortBy}
          />
        </div>

        <div className="flex items-center gap-4">
          <p className="hidden text-[13px] text-dark-4 sm:block">
            <span className="font-semibold text-dark">{showing}</span> of{" "}
            <span className="font-semibold text-dark">{total ?? showing}</span>{" "}
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
        <span className="font-semibold text-dark">{showing}</span> of{" "}
        <span className="font-semibold text-dark">{total ?? showing}</span>{" "}
        products
      </p>
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
      className={`sidebar-content fixed left-0 top-0 z-[9999] w-full duration-200 ease-out xl:static xl:z-1 xl:w-[318px] xl:flex-shrink-0 xl:translate-x-0 ${
        open
          ? "h-screen translate-x-0 overflow-y-auto bg-gray-1 p-4"
          : "-translate-x-full"
      }`}
      style={{ paddingTop: open ? stickyOffset : undefined }}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-4">
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-3 bg-gray-2 px-4 py-3 xl:mt-0">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-dark">
              <SlidersHorizontal className="h-4 w-4 text-blue" />
              Filters
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClearAll}
                className="text-[12.5px] font-semibold text-blue transition-opacity hover:opacity-80"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue xl:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-gray-3 bg-gray-2 p-3">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search frames…"
              className="w-full rounded-xl border border-gray-3 bg-gray-1 py-2.5 pl-9 pr-3 text-[13.5px] text-dark outline-none transition-colors placeholder:text-dark-5 focus:border-blue"
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
    <>
      <PageHero
        eyebrow="The collection"
        title="Shop all eyewear"
        description="Prescription frames, sunglasses and contact lenses — filter by shape, size, material or budget to narrow it down."
        crumbs={[{ label: "Shop" }]}
      />

      <section className="relative overflow-hidden bg-gray-1 pb-16 pt-8">
        <SiteContainer>
          {error && (
            <div className="mb-5 rounded-2xl border border-red/30 bg-red/10 px-5 py-4 text-[14px] text-red">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
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
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
                    : "flex flex-col gap-4"
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
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-3 bg-gray-2/60 px-6 py-16 text-center">
                <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-3 bg-gray-1 text-blue">
                  <PackageSearch className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-semibold text-dark">
                  No frames match those filters
                </h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-body">
                  Try widening the price range or clearing a filter or two —
                  there is a good chance we stock something close.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue px-7 text-[13px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
                >
                  Clear all filters
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
    </>
  );
}
