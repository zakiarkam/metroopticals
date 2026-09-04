"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
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
import EmptyState from "@/components/common/EmptyState";
import ProductCard from "@/components/common/ProductCard";
import CustomSelect from "./CustomSelect";
import CategoryDropdown from "./CategoryDropdown";
import PriceDropdown from "./PriceDropdown";
import type { ProductFacets } from "@/features/products/types/product";
import type { Category } from "@/features/categories/types/category";
import AdZoneClient from "@/features/advertisements/components/site/AdZoneClient";
import ShopFilters, {
  EMPTY_SELECTION,
  useFacets,
  type FilterKey,
  type FilterSelection,
} from "./ShopFilters";
import {
  FRAME_SHAPE_LABELS,
  GENDER_LABELS,
  RIM_TYPE_LABELS,
} from "@/features/products/utils/eyewear";
import { useProducts } from "@/features/products/hooks/use-products";
import LensIntentBanner from "@/features/lenses/components/LensIntentBanner";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { ProductsLoadingSkeleton } from "./ShopSkeleton";
import Pagination from "@/components/ui/pagination";

const PRICE_MIN = 0;
const PRICE_MAX = 100000;
const PAGE_SIZE = 9;

type ProductStyle = "grid" | "list";

const sortOptions = [
  { label: "Latest Products", value: "createdAt" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Title: A-Z", value: "title-asc" },
];

const SIZE_LABELS: Record<string, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
};

/** Human label for one ticked filter value, used by the removable chips. */
const filterValueLabel = (
  key: FilterKey,
  value: string,
  facets: ProductFacets | null,
) => {
  switch (key) {
    case "genders":
      return (GENDER_LABELS as Record<string, string>)[value] ?? value;
    case "shapes":
      return (FRAME_SHAPE_LABELS as Record<string, string>)[value] ?? value;
    case "rimTypes":
      return (RIM_TYPE_LABELS as Record<string, string>)[value] ?? value;
    case "sizes":
      return SIZE_LABELS[value] ?? value;
    case "brands":
      return facets?.brands.find((b) => b.value === value)?.label ?? value;
    default:
      return value;
  }
};

/* ------------------------------------------------------------------ toolbar */

const ShopToolbar = React.memo(function ShopToolbar({
  productStyle,
  setProductStyle,
  sortBy,
  setSortBy,
  total,
  rangeStart,
  rangeEnd,
  onOpenFilters,
}: {
  productStyle: ProductStyle;
  setProductStyle: (v: ProductStyle) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onOpenFilters: () => void;
}) {
  const viewButton = (style: ProductStyle) =>
    `inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
      productStyle === style
        ? "border-blue bg-blue text-white"
        : "border-gray-3 bg-gray-1 text-dark hover:border-blue hover:text-blue"
    }`;

  // "Showing 49–60 of 340" - the old copy printed the current page size against
  // the total, so page five still claimed to be showing the first twelve.
  const count =
    total === 0 ? (
      "No products"
    ) : (
      <>
        Showing{" "}
        <span className="font-semibold text-dark">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        of <span className="font-semibold text-dark">{total}</span>
      </>
    );

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-3 bg-gray-2 p-3 shadow-2 sm:p-3.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-3 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue xl:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>

        <CustomSelect
          options={sortOptions}
          value={sortBy}
          onChange={setSortBy}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[13px] text-dark-4">{count}</p>

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
  );
});

/* ------------------------------------------------------------------ sidebar */

const ShopSidebar = React.memo(function ShopSidebar({
  open,
  onClose,
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
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  categories: Category[];
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
      className={`sidebar-content fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[360px] overflow-y-auto bg-gray-1 p-4 shadow-4 transition-transform duration-200 ease-out xl:static xl:z-auto xl:w-[300px] xl:max-w-none xl:flex-shrink-0 xl:translate-x-0 xl:overflow-visible xl:bg-transparent xl:p-0 xl:shadow-none ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        paddingTop: open ? "var(--site-header-height, 132px)" : undefined,
      }}
      aria-hidden={!open ? undefined : false}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-3 bg-gray-2 px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-dark">
            <SlidersHorizontal className="h-4 w-4 text-blue" />
            Filters
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-10 items-center text-[12.5px] font-semibold text-blue transition-opacity hover:opacity-80"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue xl:hidden"
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
            aria-label="Search frames"
            className="w-full rounded-xl border border-gray-3 bg-gray-1 py-2.5 pl-9 pr-3 text-[13.5px] text-dark transition-colors placeholder:text-dark-5 focus:border-blue"
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

        {/* Sidebar advertising sits below the filters so it never pushes
            the controls out of reach on a short screen. */}
        <AdZoneClient placement="shop-sidebar" />
      </div>
    </div>
  );
});

const selectionFromParams = (params: URLSearchParams): FilterSelection => {
  const read = (key: FilterKey) =>
    (params.get(key) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  return {
    genders: read("genders"),
    brands: read("brands"),
    sizes: read("sizes"),
    shapes: read("shapes"),
    colors: read("colors"),
    materials: read("materials"),
    rimTypes: read("rimTypes"),
  };
};

/* --------------------------------------------------------------------- page */

export default function ShopWithSidebar() {
  const initialParams = useSearchParams();

  const [productStyle, setProductStyle] = useState<ProductStyle>("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState(
    () => initialParams.get("search") ?? "",
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const raw =
      initialParams.get("categories") || initialParams.get("category");
    return raw
      ? raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];
  });
  const [priceRange, setPriceRange] = useState(() => ({
    from: Number(initialParams.get("minPrice")) || PRICE_MIN,
    to: Number(initialParams.get("maxPrice")) || PRICE_MAX,
  }));
  const [sortBy, setSortBy] = useState(
    () => initialParams.get("sortBy") ?? "createdAt",
  );
  /** The "Offers" entry point in the navigation arrives as `?onSale=true`. */
  const [onSale, setOnSale] = useState(
    () => initialParams.get("onSale") === "true",
  );
  const [currentPage, setCurrentPage] = useState(1);

  /** Attribute filters (gender, brand, size, shape, colour, material, rim). */
  const [filterSelection, setFilterSelection] = useState<FilterSelection>(() =>
    selectionFromParams(new URLSearchParams(initialParams.toString())),
  );

  const { data, loading, error, updateParams } = useProducts({
    page: 1,
    limit: PAGE_SIZE,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { categories, loading: categoriesLoading } = useCategories();

  // Facet counts follow the category scope, not the ticked attribute filters
  // otherwise ticking "Round" would drop every other shape out of the list.
  const debouncedSearch = useDebounced(searchTerm, 400);
  const debouncedPrice = useDebounced(priceRange, 300);

  const { facets, loading: facetsLoading } = useFacets(
    selectedCategories[0],
    debouncedSearch || undefined,
  );

  const categoryKey = selectedCategories.join(",");
  const filterKey = JSON.stringify(filterSelection);

  const querySignature = [
    debouncedSearch.trim(),
    categoryKey,
    filterKey,
    debouncedPrice.from,
    debouncedPrice.to,
    sortBy,
    onSale,
  ].join("|");
  const lastSignature = useRef(querySignature);

  useEffect(() => {
    const attributes = Object.fromEntries(
      Object.entries(filterSelection).map(([key, values]) => [
        key,
        values.length ? values : undefined,
      ]),
    );

    const [field, order] = sortBy.includes("-")
      ? sortBy.split("-")
      : [sortBy, "desc"];

    const atDefaultPrice =
      debouncedPrice.from === PRICE_MIN && debouncedPrice.to === PRICE_MAX;

    const restarted = lastSignature.current !== querySignature;
    lastSignature.current = querySignature;
    const page = restarted ? 1 : currentPage;
    if (restarted && currentPage !== 1) setCurrentPage(1);

    const brands = (attributes.brands as string[] | undefined) ?? [];

    updateParams({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      categories: selectedCategories.length ? selectedCategories : undefined,
      minPrice: atDefaultPrice ? undefined : debouncedPrice.from,
      maxPrice: atDefaultPrice ? undefined : debouncedPrice.to,
      onSale: onSale || undefined,
      sortBy: field as "createdAt" | "price" | "title",
      sortOrder: order as "asc" | "desc",
      ...attributes,
      // A ticked child category narrows by brand, so merge rather than replace.
      brands: brands.length ? brands : undefined,
    });
    // `filterKey` and `categoryKey` capture deep changes; updateParams is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    debouncedSearch,
    debouncedPrice.from,
    debouncedPrice.to,
    sortBy,
    onSale,
    filterKey,
    categoryKey,
    categories,
  ]);

  /* -------------------------------------------------------- URL reflection */

  useEffect(() => {
    const fromUrl = initialParams.get("search") ?? "";
    if (fromUrl !== searchTerm.trim()) setSearchTerm(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialParams]);

  // Keeps the address bar shareable without pushing a history entry per tick
  // ticking five brands used to mean five Back presses to leave the page.
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (selectedCategories.length)
      params.set("categories", selectedCategories.join(","));
    Object.entries(filterSelection).forEach(([key, values]) => {
      if (values.length) params.set(key, values.join(","));
    });
    if (priceRange.from !== PRICE_MIN)
      params.set("minPrice", String(priceRange.from));
    if (priceRange.to !== PRICE_MAX)
      params.set("maxPrice", String(priceRange.to));
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (onSale) params.set("onSale", "true");

    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [
    searchTerm,
    selectedCategories,
    filterSelection,
    priceRange,
    sortBy,
    onSale,
  ]);

  /* ------------------------------------------------------------- the drawer */

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  // A drawer left open while rotating to a desktop width would otherwise stay
  // translated off-canvas over the static column.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const close = () => query.matches && setDrawerOpen(false);
    close();
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // List view has no room on a phone.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 650px)");
    const enforceGrid = () => query.matches && setProductStyle("grid");
    enforceGrid();
    query.addEventListener("change", enforceGrid);
    return () => query.removeEventListener("change", enforceGrid);
  }, []);

  /* ------------------------------------------------------------- handlers */

  const toggleFilterValue = useCallback((key: FilterKey, value: string) => {
    setFilterSelection((current) => {
      const values = current[key] ?? [];
      return {
        ...current,
        [key]: values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value],
      };
    });
  }, []);

  const clearAttributeFilters = useCallback(
    () => setFilterSelection(EMPTY_SELECTION),
    [],
  );

  const clearEverything = useCallback(() => {
    setSearchTerm("");
    setSelectedCategories([]);
    setPriceRange({ from: PRICE_MIN, to: PRICE_MAX });
    setSortBy("createdAt");
    setFilterSelection(EMPTY_SELECTION);
    setOnSale(false);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* --------------------------------------------------------------- derived */

  const total = data.pagination?.total ?? 0;
  const pageSize = data.pagination?.limit ?? PAGE_SIZE;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  const activeChips = useMemo(
    () =>
      (Object.entries(filterSelection) as [FilterKey, string[]][]).flatMap(
        ([key, values]) =>
          values.map((value) => ({
            key,
            value,
            label: filterValueLabel(key, value, facets),
          })),
      ),
    [facets, filterSelection],
  );

  const hasAnyFilter =
    onSale ||
    activeChips.length > 0 ||
    Boolean(searchTerm.trim()) ||
    selectedCategories.length > 0 ||
    priceRange.from !== PRICE_MIN ||
    priceRange.to !== PRICE_MAX;

  return (
    <>
      <PageHero
        eyebrow="The collection"
        title="Shop all eyewear"
        description="Prescription frames, sunglasses and lenses - filter by shape, size, brand or budget to narrow it down."
        crumbs={[{ label: "Shop" }]}
      />

      <section className="bg-gray-1 pb-16 pt-8">
        <SiteContainer>
          {/* Someone who arrived from a lens guide is here to put that lens
              into a frame. Saying so keeps the errand visible while they
              browse, and carries the choice into the lens picker later. */}
          <LensIntentBanner />

          {error && (
            <div className="mb-5 rounded-2xl border border-red/30 bg-red/10 px-5 py-4 text-[14px] text-red">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
            {/* Scrim. Mounted only while the drawer is open so it can never
                swallow clicks on the desktop layout. */}
            {drawerOpen && (
              <div
                aria-hidden
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-dark/40 xl:hidden"
              />
            )}

            <ShopSidebar
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              categories={categories}
              categoriesLoading={categoriesLoading}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              onClearAll={clearEverything}
              facets={facets}
              facetsLoading={facetsLoading}
              filterSelection={filterSelection}
              onFilterChange={setFilterSelection}
              onClearFilters={clearAttributeFilters}
            />

            <div className="w-full min-w-0 flex-1">
              <AdZoneClient placement="shop-top" className="mb-6" />

              <ShopToolbar
                productStyle={productStyle}
                setProductStyle={setProductStyle}
                sortBy={sortBy}
                setSortBy={setSortBy}
                total={total}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onOpenFilters={() => setDrawerOpen(true)}
              />

              {loading && (
                <ProductsLoadingSkeleton
                  variant={productStyle}
                  count={PAGE_SIZE}
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
                  {data.products.map((item: any, index: number) => (
                    <ProductCard
                      key={item.id ?? index}
                      layout={productStyle}
                      item={{
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        discountedPrice: item.discountedPrice,
                        images: item.images,
                        stock: item.stock,
                        status: item.status,
                        description: item.description,
                        categoryName: item.category?.name ?? null,
                        brandName: item.brand?.name ?? null,
                        rating: item.rating ?? null,
                        reviewCount: item.reviewCount ?? null,
                        frameColors: item.frameColors ?? null,
                        colorStocks: item.colorStocks ?? null,
                        raw: item,
                      }}
                    />
                  ))}
                </div>
              )}

              {!loading && data.products.length === 0 && (
                <EmptyState
                  icon={<PackageSearch className="h-7 w-7" />}
                  title="No frames match those filters"
                  description="Try widening the price range or clearing a filter or two - there is a good chance we stock something close."
                  action={
                    hasAnyFilter
                      ? { label: "Clear all filters", onClick: clearEverything }
                      : { label: "Book an eye test", href: "/contact" }
                  }
                />
              )}

              {!loading && (data.pagination?.totalPages ?? 1) > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={data.pagination!.totalPages}
                  totalItems={total}
                  itemsPerPage={pageSize}
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

/** Value that only settles once the user stops typing / dragging. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
