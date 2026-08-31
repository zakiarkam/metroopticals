"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Barcode, PackageX, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toast } from "@/lib/utils/toast";
import { getProductImageUrl } from "@/lib/storageUtils";
import { formatPrice } from "@/lib/utils/price";
import { getPosFilters, searchPosProducts } from "@/features/pos/api/pos-api";
import type { PosProduct } from "@/features/pos/types/pos";
import { catalogueUnitPrice } from "@/features/pos/hooks/use-pos-cart";

type PosProductPanelProps = {
  /** Returns false when the line was refused, so the panel can keep focus. */
  onPick: (product: PosProduct, color?: string | null) => boolean;
  onAddCustomItem: () => void;
  quantityOnBill: (productId: number) => number;
  searchRef: React.RefObject<HTMLInputElement | null>;
};

const stockTone = (available: number) => {
  if (available <= 0) return "bg-red-light-6 text-red border-red/20";
  if (available <= 3) return "bg-yellow-light-4 text-yellow-dark border-yellow-dark/20";
  return "bg-green-light-6 text-green border-green/20";
};

const PosProductPanel: React.FC<PosProductPanelProps> = ({
  onPick,
  onAddCustomItem,
  quantityOnBill,
  searchRef,
}) => {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [brandId, setBrandId] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [filters, setFilters] = useState<{
    categories: Array<{ id: number; name: string; parentId: number | null }>;
    brands: Array<{ id: number; name: string }>;
  }>({ categories: [], brands: [] });
  const [colourChoice, setColourChoice] = useState<PosProduct | null>(null);

  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getPosFilters()
      .then(setFilters)
      .catch(() => {
        // Filters are a convenience; searching still works without them.
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const runSearch = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);

    try {
      const result = await searchPosProducts({
        search: debounced || undefined,
        categoryId: categoryId === "all" ? undefined : Number(categoryId),
        brandId: brandId === "all" ? undefined : Number(brandId),
        inStockOnly,
        limit: 36,
        signal: controller.signal,
      });
      setProducts(result.products);

      // A scanner types the code and hits Enter: one exact match means the
      // cashier meant that item, so it goes straight onto the bill.
      if (result.scanned && result.products.length === 1) {
        const product = result.products[0];
        if (product.frameColors?.length) {
          setColourChoice(product);
        } else if (onPick(product)) {
          setTerm("");
          searchRef.current?.focus();
        }
      }
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      Toast.error(
        error?.response?.data?.message || "Could not search the catalogue",
      );
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }, [debounced, categoryId, brandId, inStockOnly, onPick, searchRef]);

  useEffect(() => {
    void runSearch();
    return () => requestRef.current?.abort();
  }, [runSearch]);

  const handlePick = (product: PosProduct) => {
    if (product.stock <= 0) {
      Toast.error(`${product.title} is out of stock`);
      return;
    }
    if (product.frameColors?.length) {
      setColourChoice(product);
      return;
    }
    onPick(product);
  };

  const categoryOptions = useMemo(() => {
    const byId = new Map(filters.categories.map((c) => [c.id, c]));
    return filters.categories.map((category) => ({
      id: category.id,
      label: category.parentId
        ? `${byId.get(category.parentId)?.name ?? ""} › ${category.name}`.trim()
        : category.name,
    }));
  }, [filters.categories]);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-3 bg-gray-2 shadow-1">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-3 px-4 py-3 sm:px-5">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
          <Input
            ref={searchRef}
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search or scan — name, code, barcode, brand"
            className="h-10 pl-10 pr-9 text-custom-sm"
            aria-label="Search or scan a product"
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                searchRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-body transition hover:bg-gray-1 hover:text-dark"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-10 w-[190px] text-custom-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger className="h-10 w-[160px] text-custom-sm">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {filters.brands.map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setInStockOnly((value) => !value)}
          className={`h-10 rounded-lg border px-3 text-custom-xs font-medium transition ${
            inStockOnly
              ? "border-blue/30 bg-blue-light-5 text-blue"
              : "border-gray-3 bg-gray-1 text-body hover:text-dark"
          }`}
        >
          In stock only
        </button>

        <button
          type="button"
          onClick={onAddCustomItem}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-3 bg-gray-1 px-3 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:bg-blue-light-5 hover:text-blue"
        >
          <Plus className="h-4 w-4" />
          Service / custom item
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-[168px] animate-pulse rounded-xl border border-gray-3 bg-gray-1"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <PackageX className="h-8 w-8 text-gray-4" />
            <p className="text-custom-sm font-medium text-dark">
              Nothing matches “{debounced}”
            </p>
            <p className="text-custom-xs text-body">
              Try the frame code, or add it as a custom item if it is not in the
              catalogue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => {
              const image = getProductImageUrl(product.images?.[0]);
              const onBill = quantityOnBill(product.id);
              const available = product.stock - onBill;
              const price = catalogueUnitPrice(product);
              const discounted = price < product.price;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handlePick(product)}
                  disabled={product.stock <= 0}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-3 bg-gray-2 text-left transition hover:border-blue/40 hover:shadow-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-3 disabled:hover:shadow-none"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-1">
                    {image ? (
                      <Image
                        src={image}
                        alt={product.title}
                        fill
                        sizes="200px"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-4">
                        <Barcode className="h-7 w-7" />
                      </div>
                    )}
                    <span
                      className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stockTone(
                        available,
                      )}`}
                    >
                      {available > 0 ? `${available} left` : "Out of stock"}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="line-clamp-2 text-custom-sm font-medium leading-snug text-dark">
                      {product.title}
                    </p>
                    <p className="text-custom-xs text-body">
                      {product.sku || product.brand?.name || product.category?.name || ""}
                    </p>
                    <div className="mt-auto flex items-baseline gap-2 pt-1">
                      <span className="text-custom-sm font-semibold text-blue">
                        {formatPrice(price)}
                      </span>
                      {discounted && (
                        <span className="text-custom-xs text-body line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {colourChoice && (
        <ColourPicker
          product={colourChoice}
          onClose={() => setColourChoice(null)}
          onChoose={(colour) => {
            const added = onPick(colourChoice, colour);
            setColourChoice(null);
            if (added) searchRef.current?.focus();
          }}
        />
      )}
    </div>
  );
};

/** Which colourway is leaving the shop — it prints on the bill. */
const ColourPicker: React.FC<{
  product: PosProduct;
  onClose: () => void;
  onChoose: (colour: string | null) => void;
}> = ({ product, onClose, onChoose }) => (
  <Dialog open onOpenChange={(value) => !value && onClose()}>
    <DialogContent hideClose className="flex max-w-md flex-col p-0 sm:p-0">
      <DialogHeader className="border-b border-gray-3 bg-gray-2 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <DialogTitle className="truncate">{product.title}</DialogTitle>
            <DialogDescription>
              Which colour is the customer taking?
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-dark-4 transition hover:bg-gray-1 hover:text-dark"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>

      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {product.frameColors.map((colour) => {
            // The recorded count for this colourway, when it has one. Staff
            // see the number — unlike the storefront, the counter runs on it.
            // A counted colour at zero cannot be picked at all; if the shelf
            // disagrees with the book, "Add without a colour" still works
            // and the count is corrected from the products page.
            const count =
              product.colorStocks?.find(
                (row) =>
                  row.color.trim().toLowerCase() ===
                  colour.trim().toLowerCase(),
              )?.stock ?? null;
            const soldOut = count != null && count <= 0;

            return (
              <button
                key={colour}
                type="button"
                disabled={soldOut}
                onClick={() => onChoose(colour)}
                className={`rounded-lg border px-3 py-2 text-custom-sm font-medium transition ${
                  soldOut
                    ? "cursor-not-allowed border-red/30 bg-red/[0.04] text-dark-4 opacity-70"
                    : "border-gray-3 bg-gray-1 text-dark hover:border-blue/40 hover:bg-blue-light-5 hover:text-blue"
                }`}
              >
                {colour}
                {count != null && (
                  <span
                    className={`ml-1.5 text-custom-xs font-semibold ${
                      soldOut ? "text-red" : "text-dark-4"
                    }`}
                  >
                    {soldOut ? "· out" : `· ${count} left`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DialogFooter className="border-t border-gray-3 bg-gray-2 px-6 py-4">
        <Button type="button" variant="outline" onClick={() => onChoose(null)}>
          Add without a colour
        </Button>
        <Button
          type="button"
          onClick={onClose}
          className="bg-blue hover:bg-blue-dark"
        >
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default PosProductPanel;
