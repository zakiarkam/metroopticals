"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  PackagePlus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toast } from "@/lib/utils/toast";
import {
  adjustStock,
  getLowStock,
  getStockMovements,
  searchPosProducts,
} from "@/features/pos/api/pos-api";
import {
  STOCK_REASON_LABELS,
  type PosProduct,
  type StockMovement,
} from "@/features/pos/types/pos";

type LowStockProduct = {
  id: number;
  title: string;
  sku?: string | null;
  stock: number;
  status: string;
  category?: { name: string } | null;
  brand?: { name: string } | null;
};

/**
 * Stock in, corrections, and the ledger behind the count.
 *
 * This is not a second stock: it is the same `stock` number the website and
 * the till both read. What it adds is a way to put a delivery in, correct a
 * miscount, and see why the number moved.
 */
const PosStockTab: React.FC = () => {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<PosProduct[]>([]);
  const [selected, setSelected] = useState<PosProduct | null>(null);
  const [searching, setSearching] = useState(false);

  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<"PURCHASE" | "ADJUSTMENT" | "RETURN">(
    "PURCHASE",
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementFilter, setMovementFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMovements, setTotalMovements] = useState(0);
  const [loadingLedger, setLoadingLedger] = useState(true);

  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    searchPosProducts({ search: debounced, limit: 8 })
      .then((result) => {
        if (active) setResults(result.products);
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [debounced]);

  const loadLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const result = await getStockMovements({
        page,
        limit: 25,
        reason: movementFilter === "all" ? undefined : movementFilter,
      });
      setMovements(result.movements);
      setTotalPages(result.pagination.totalPages);
      setTotalMovements(result.pagination.total);
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message ||
          "The stock history could not be loaded",
      );
    } finally {
      setLoadingLedger(false);
    }
  }, [page, movementFilter]);

  const loadLowStock = useCallback(async () => {
    try {
      const result = await getLowStock(10);
      setLowStock(result.products);
    } catch {
      // The ledger is the point of this screen; the low-stock list is a bonus.
    }
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  useEffect(() => {
    void loadLowStock();
  }, [loadLowStock]);

  const submit = async () => {
    if (!selected) {
      Toast.error("Choose a product first");
      return;
    }
    const value = Number(quantity);
    if (!Number.isFinite(value) || value < 0) {
      Toast.error("Enter a quantity");
      return;
    }
    if (mode !== "set" && value <= 0) {
      Toast.error("Enter a quantity");
      return;
    }

    setSaving(true);
    try {
      const result = await adjustStock({
        productId: selected.id,
        mode,
        quantity: value,
        reason: mode === "add" ? reason : "ADJUSTMENT",
        note: note.trim() || undefined,
      });

      Toast.success(
        `${result.product.title} now shows ${result.product.stock} in stock`,
      );
      setSelected((current) =>
        current ? { ...current, stock: result.product.stock } : current,
      );
      setQuantity("");
      setNote("");
      void loadLedger();
      void loadLowStock();
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "The stock could not be changed",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------------------------- adjust panel */}
        <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
          <div className="border-b border-gray-3 px-5 py-4">
            <h3 className="flex items-center gap-2 text-custom-lg font-semibold text-dark">
              <PackagePlus className="h-4 w-4 text-blue" />
              Stock in &amp; corrections
            </h3>
            <p className="text-custom-xs text-body">
              Received a delivery, or counted the shelf and found a different
              number? Record it here so the history explains the count.
            </p>
          </div>

          <div className="px-5 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
              <Input
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  setSelected(null);
                }}
                placeholder="Search by name, code or barcode"
                className="h-10 pl-10 text-custom-sm"
                aria-label="Find a product"
              />
            </div>

            {!selected && debounced && (
              <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-3">
                {searching ? (
                  <li className="flex items-center gap-2 px-4 py-3 text-custom-xs text-body">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching…
                  </li>
                ) : results.length === 0 ? (
                  <li className="px-4 py-3 text-custom-xs text-body">
                    Nothing matches “{debounced}”.
                  </li>
                ) : (
                  results.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(product);
                          setTerm(product.title);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-1"
                      >
                        <span className="min-w-0 flex-1 truncate text-custom-sm text-dark">
                          {product.title}
                        </span>
                        <span className="text-custom-xs text-body">
                          {product.sku || product.brand?.name || ""}
                        </span>
                        <span className="text-custom-xs font-medium text-dark">
                          {product.stock} in stock
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {selected && (
              <div className="mt-4 rounded-xl border border-gray-3 bg-gray-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-custom-sm font-medium text-dark">
                    {selected.title}
                  </p>
                  <span className="rounded-full border border-gray-3 bg-gray-2 px-2 py-0.5 text-[11px] text-body">
                    {selected.stock} in stock
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setTerm("");
                    }}
                    className="ml-auto text-custom-xs text-blue underline-offset-2 hover:underline"
                  >
                    Change product
                  </button>
                </div>

                <div className="mt-3 flex h-10 items-center rounded-lg border border-gray-3 bg-gray-2 p-1">
                  {(
                    [
                      ["add", "Stock in"],
                      ["remove", "Remove"],
                      ["set", "Set count"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`h-8 flex-1 rounded-md text-custom-xs font-medium transition ${
                        mode === value
                          ? "bg-blue-light-5 text-blue"
                          : "text-body hover:text-dark"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-custom-xs text-body">
                      {mode === "set" ? "Counted on the shelf" : "Quantity"}
                    </span>
                    <Input
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      type="number"
                      min={0}
                      className="mt-1 h-10 text-right text-custom-sm tabular-nums"
                    />
                  </label>

                  {mode === "add" && (
                    <label className="block">
                      <span className="text-custom-xs text-body">Reason</span>
                      <Select
                        value={reason}
                        onValueChange={(value) =>
                          setReason(value as typeof reason)
                        }
                      >
                        <SelectTrigger className="mt-1 h-10 text-custom-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PURCHASE">
                            Stock received
                          </SelectItem>
                          <SelectItem value="RETURN">
                            Customer return
                          </SelectItem>
                          <SelectItem value="ADJUSTMENT">Correction</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  )}
                </div>

                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Note - supplier invoice number, who counted it"
                  className="mt-3 h-10 text-custom-sm"
                />

                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue text-custom-sm font-semibold text-white transition hover:bg-blue-dark disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "add"
                    ? "Add to stock"
                    : mode === "remove"
                      ? "Remove from stock"
                      : "Set the count"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- low stock */}
        <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
          <div className="flex items-center gap-2 border-b border-gray-3 px-5 py-4">
            <TriangleAlert className="h-4 w-4 text-yellow-dark" />
            <h3 className="text-custom-lg font-semibold text-dark">
              Running low
            </h3>
            <span className="ml-auto text-custom-xs text-body">
              10 or fewer
            </span>
          </div>
          <ul className="max-h-[420px] divide-y divide-gray-2 overflow-y-auto">
            {lowStock.length === 0 ? (
              <li className="px-5 py-8 text-center text-custom-xs text-body">
                Nothing is running low.
              </li>
            ) : (
              lowStock.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-custom-sm text-dark">
                      {product.title}
                    </p>
                    <p className="truncate text-custom-xs text-body">
                      {product.sku ||
                        product.brand?.name ||
                        product.category?.name ||
                        ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      product.stock <= 0
                        ? "border-red/20 bg-red-light-6 text-red"
                        : "border-yellow-dark/20 bg-yellow-light-4 text-yellow-dark"
                    }`}
                  >
                    {product.stock <= 0 ? "Out" : `${product.stock} left`}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------------- ledger */}
      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-3 px-5 py-4">
          <div>
            <h3 className="text-custom-lg font-semibold text-dark">
              Stock history
            </h3>
            <p className="text-custom-xs text-body">
              {totalMovements} movement{totalMovements === 1 ? "" : "s"} on
              record
            </p>
          </div>

          <Select
            value={movementFilter}
            onValueChange={(value) => {
              setMovementFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="ml-auto h-9 w-[190px] text-custom-xs">
              <SelectValue placeholder="Everything" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everything</SelectItem>
              <SelectItem value="SALE">Counter sales</SelectItem>
              <SelectItem value="ONLINE_ORDER">Website orders</SelectItem>
              <SelectItem value="PURCHASE">Stock received</SelectItem>
              <SelectItem value="RETURN">Customer returns</SelectItem>
              <SelectItem value="VOID">Cancelled bills</SelectItem>
              <SelectItem value="ADJUSTMENT">Corrections</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.4fr_0.6fr_1fr_1.4fr_1fr] gap-4 border-b border-gray-3 px-5 py-3 text-custom-xs uppercase tracking-wide text-body">
              <span>Product</span>
              <span>Change</span>
              <span>Reason</span>
              <span>Note / bill</span>
              <span>When</span>
            </div>

            {loadingLedger ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-custom-sm text-body">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history…
              </div>
            ) : movements.length === 0 ? (
              <div className="px-5 py-12 text-center text-custom-sm text-body">
                Nothing recorded yet. Stock changes from here on will be listed.
              </div>
            ) : (
              movements.map((movement) => (
                <div
                  key={movement.id}
                  className="grid grid-cols-[1.4fr_0.6fr_1fr_1.4fr_1fr] items-center gap-4 border-b border-gray-2 px-5 py-3 text-custom-sm last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-dark">
                      {movement.product?.title ?? "Deleted product"}
                    </p>
                    <p className="truncate text-custom-xs text-body">
                      {movement.product?.sku || ""}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      movement.delta >= 0
                        ? "border-green/20 bg-green-light-6 text-green"
                        : "border-red/20 bg-red-light-6 text-red"
                    }`}
                  >
                    {movement.delta >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </span>

                  <span className="text-custom-xs text-body">
                    {STOCK_REASON_LABELS[movement.reason] ?? movement.reason}
                  </span>

                  <div className="min-w-0">
                    {movement.order && (
                      <p className="truncate font-mono text-custom-xs text-blue">
                        {movement.order.orderNumber}
                      </p>
                    )}
                    {movement.note && (
                      <p className="truncate text-custom-xs text-body">
                        {movement.note}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-custom-xs text-dark">
                      {new Date(movement.createdAt).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                    <p className="text-custom-xs text-body">
                      {new Date(movement.createdAt).toLocaleTimeString(
                        "en-GB",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                      {movement.createdBy?.name
                        ? ` · ${movement.createdBy.name}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-gray-3 px-5 py-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalMovements}
              itemsPerPage={25}
              onPageChange={setPage}
              showItemsPerPage={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PosStockTab;
