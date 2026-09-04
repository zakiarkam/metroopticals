"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  Download,
  Loader2,
  Printer,
  Search,
  Wallet,
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
import { formatPrice } from "@/lib/utils/price";
import {
  getOutstandingBills,
  getPosReport,
  getSales,
  type OutstandingBill,
} from "@/features/pos/api/pos-api";
import OutstandingBillsCard from "@/features/pos/components/OutstandingBillsCard";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
  type PosReport,
  type SaleListRow,
} from "@/features/pos/types/pos";
import {
  shopDateKey,
  shopDateKeyDaysAgo,
} from "@/features/pos/utils/shop-time";
import SaleDetailDialog from "@/features/pos/components/dialogs/SaleDetailDialog";

type RangePreset = "today" | "week" | "month" | "custom";

const paymentTone = (status: PaymentStatus) => {
  switch (status) {
    case "PAID":
      return "bg-green-light-6 text-green border-green/20";
    case "PARTIAL":
      return "bg-yellow-light-4 text-yellow-dark border-yellow-dark/20";
    case "REFUNDED":
      return "bg-purple-light-5 text-purple-600 border-purple-300/40";
    default:
      return "bg-red-light-6 text-red border-red/20";
  }
};

const presetRange = (preset: RangePreset) => {
  const today = shopDateKey();
  if (preset === "today") return { startDate: today, endDate: today };
  if (preset === "week")
    return { startDate: shopDateKeyDaysAgo(6), endDate: today };
  if (preset === "month")
    return { startDate: shopDateKeyDaysAgo(29), endDate: today };
  return { startDate: today, endDate: today };
};

/**
 * Every bill written at the counter, and what the shop actually took.
 *
 * The summary above the table answers the question the counter asks at close
 * of day  billed, collected, still owed  for the whole filter rather than
 * the page on screen.
 */
const PosSalesTab: React.FC<{ canVoid: boolean }> = ({ canVoid }) => {
  const [preset, setPreset] = useState<RangePreset>("today");
  const [range, setRange] = useState(presetRange("today"));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState<SaleListRow[]>([]);
  const [summary, setSummary] = useState({
    billed: 0,
    collected: 0,
    outstanding: 0,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PosReport | null>(null);
  const [openSaleId, setOpenSaleId] = useState<number | null>(null);
  // The credit book is deliberately not filtered by the date range: money owed
  // from three weeks ago is exactly what must not fall off the screen.
  const [outstanding, setOutstanding] = useState<{
    bills: OutstandingBill[];
    summary: {
      count: number;
      total: number;
      overdueCount: number;
      overdueTotal: number;
      dueToday: number;
    };
  }>({
    bills: [],
    summary: {
      count: 0,
      total: 0,
      overdueCount: 0,
      overdueTotal: 0,
      dueToday: 0,
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesResult, reportResult, outstandingResult] = await Promise.all([
        getSales({
          page,
          limit,
          search: debouncedSearch || undefined,
          startDate: range.startDate,
          endDate: range.endDate,
          paymentStatus: paymentStatus === "all" ? undefined : paymentStatus,
          paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
          channel: "POS",
        }),
        getPosReport({ startDate: range.startDate, endDate: range.endDate }),
        getOutstandingBills(),
      ]);

      setRows(salesResult.sales);
      setSummary(salesResult.summary);
      setTotalPages(salesResult.pagination.totalPages);
      setTotalRows(salesResult.pagination.total);
      setReport(reportResult);
      setOutstanding(outstandingResult);
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "Counter sales could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, range, paymentStatus, paymentMethod]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (next: RangePreset) => {
    setPreset(next);
    setPage(1);
    if (next !== "custom") setRange(presetRange(next));
  };

  const cards = useMemo(
    () => [
      {
        label: "Billed",
        value: formatPrice(summary.billed),
        helper: `${totalRows} bill${totalRows === 1 ? "" : "s"}`,
        tone: "bg-blue-light-5 text-blue",
      },
      {
        label: "Collected",
        value: formatPrice(report?.summary.collected ?? summary.collected),
        helper: report?.byMethod.length
          ? report.byMethod
              .map(
                (row) =>
                  `${PAYMENT_METHOD_LABELS[row.method] ?? row.method} ${formatPrice(row.net)}`,
              )
              .join(" · ")
          : "Nothing taken yet",
        tone: "bg-green-light-6 text-green",
      },
      {
        label: "Still to collect",
        value: formatPrice(outstanding.summary.total),
        helper: outstanding.summary.overdueCount
          ? `${outstanding.summary.overdueCount} late · ${formatPrice(
              outstanding.summary.overdueTotal,
            )}`
          : outstanding.summary.count
            ? `${outstanding.summary.count} bill${
                outstanding.summary.count === 1 ? "" : "s"
              } open, none late`
            : "Everything settled",
        tone:
          outstanding.summary.overdueCount > 0
            ? "bg-red-light-6 text-red"
            : outstanding.summary.total > 0
              ? "bg-yellow-light-4 text-yellow-dark"
              : "bg-gray-1 text-body",
      },
      {
        label: "Items sold",
        value: String(report?.summary.itemsSold ?? 0),
        helper:
          report && report.summary.discountGiven > 0
            ? `${formatPrice(report.summary.discountGiven)} discount given`
            : "No discounts given",
        tone: "bg-gray-1 text-dark",
      },
    ],
    [summary, report, totalRows, outstanding],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-3 bg-gray-2 p-4 shadow-1"
          >
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${card.tone}`}
            >
              {card.label}
            </span>
            <p className="mt-2 text-heading-6 font-semibold tabular-nums text-dark">
              {card.value}
            </p>
            <p
              className="mt-0.5 line-clamp-1 text-custom-xs text-body"
              title={card.helper}
            >
              {card.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-3 px-5 py-4">
          <div>
            <h3 className="text-custom-lg font-semibold text-dark">
              Counter bills
            </h3>
            <p className="text-custom-xs text-body">
              {range.startDate === range.endDate
                ? new Date(range.startDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : `${range.startDate} → ${range.endDate}`}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex h-9 items-center rounded-full border border-gray-3 bg-gray-1 p-1">
              {(
                [
                  ["today", "Today"],
                  ["week", "7 days"],
                  ["month", "30 days"],
                  ["custom", "Custom"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyPreset(value)}
                  className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                    preset === value
                      ? "bg-gray-2 text-blue shadow-1"
                      : "text-body hover:text-dark"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-body" />
                <Input
                  type="date"
                  value={range.startDate}
                  max={range.endDate}
                  onChange={(event) => {
                    setRange((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }));
                    setPage(1);
                  }}
                  className="h-9 w-[150px] text-custom-xs"
                  aria-label="From date"
                />
                <span className="text-custom-xs text-body">to</span>
                <Input
                  type="date"
                  value={range.endDate}
                  min={range.startDate}
                  onChange={(event) => {
                    setRange((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }));
                    setPage(1);
                  }}
                  className="h-9 w-[150px] text-custom-xs"
                  aria-label="To date"
                />
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Bill no, name or phone"
                className="h-9 w-56 pl-9 text-custom-sm"
                aria-label="Search bills"
              />
            </div>

            <Select
              value={paymentStatus}
              onValueChange={(value) => {
                setPaymentStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] text-custom-xs">
                <SelectValue placeholder="Any payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any payment</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Part paid</SelectItem>
                <SelectItem value="PENDING">Unpaid</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({
                  channel: "POS",
                  startDate: range.startDate,
                  endDate: range.endDate,
                });
                if (debouncedSearch) params.set("search", debouncedSearch);
                if (paymentStatus !== "all")
                  params.set("paymentStatus", paymentStatus);
                if (paymentMethod !== "all")
                  params.set("paymentMethod", paymentMethod);
                // A plain navigation: the browser saves the file the route sends.
                window.location.href = `/api/pos/sales/export?${params.toString()}`;
              }}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-1 px-3 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:text-blue"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>

            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] text-custom-xs">
                <SelectValue placeholder="Any method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any method</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1.3fr_1.4fr_0.7fr_1fr_1fr_1fr_120px] gap-4 border-b border-gray-3 px-5 py-3 text-custom-xs uppercase tracking-wide text-body">
              <span>Bill</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Total</span>
              <span>Paid</span>
              <span>Payment</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-custom-sm text-body">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading bills…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-12 text-center text-custom-sm text-body">
                No counter bills in this range.
              </div>
            ) : (
              rows.map((sale) => {
                const balance = Math.max(0, sale.totalAmount - sale.amountPaid);
                const itemCount = sale.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );

                return (
                  <div
                    key={sale.id}
                    className="grid grid-cols-[1.3fr_1.4fr_0.7fr_1fr_1fr_1fr_120px] items-center gap-4 border-b border-gray-2 px-5 py-4 text-custom-sm transition last:border-0 hover:bg-gray-1"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenSaleId(sale.id)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate font-mono text-custom-xs text-blue">
                        {sale.orderNumber}
                      </p>
                      <p className="text-custom-xs text-body">
                        {new Date(sale.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-dark">
                        {sale.customer?.name || sale.billingName}
                      </p>
                      <p className="truncate text-custom-xs text-body">
                        {sale.customer?.phone || sale.billingPhone || "-"}
                        {sale.createdBy?.name
                          ? ` · ${sale.createdBy.name}`
                          : ""}
                      </p>
                    </div>

                    <p className="text-custom-xs text-body">{itemCount}</p>

                    <p className="font-medium tabular-nums text-dark">
                      {formatPrice(sale.totalAmount)}
                    </p>

                    <div>
                      <p className="tabular-nums text-dark">
                        {formatPrice(sale.amountPaid)}
                      </p>
                      {balance > 0.01 && (
                        <p className="text-custom-xs font-medium text-red">
                          {formatPrice(balance)} due
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${paymentTone(
                          sale.paymentStatus,
                        )}`}
                      >
                        {PAYMENT_STATUS_LABELS[sale.paymentStatus]}
                      </span>
                      {sale.voidedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red">
                          <Ban className="h-3 w-3" /> Cancelled
                        </span>
                      ) : (
                        <span className="text-[11px] text-body">
                          {sale.paymentMethod === "MIXED"
                            ? "Split"
                            : PAYMENT_METHOD_LABELS[
                                sale.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                              ] || "-"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOpenSaleId(sale.id)}
                        className="rounded-lg border border-gray-3 bg-gray-1 px-2.5 py-1.5 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:text-blue"
                      >
                        Open
                      </button>
                      <Link
                        href={`/admin/pos/receipt/${sale.id}`}
                        className="rounded-lg border border-gray-3 bg-gray-1 p-1.5 text-body transition hover:border-blue/30 hover:text-blue"
                        aria-label={`Print bill ${sale.orderNumber}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-gray-3 px-5 py-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalRows}
              itemsPerPage={limit}
              onPageChange={setPage}
              showItemsPerPage={false}
            />
          </div>
        )}
      </div>

      <OutstandingBillsCard
        bills={outstanding.bills}
        summary={outstanding.summary}
        loading={loading}
        onOpen={setOpenSaleId}
      />

      {report &&
        (report.byCashier.length > 0 || report.topProducts.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
              <h3 className="border-b border-gray-3 px-5 py-4 text-custom-lg font-semibold text-dark">
                Who billed what
              </h3>
              <ul className="divide-y divide-gray-2">
                {report.byCashier.map((cashier) => (
                  <li
                    key={`${cashier.id}-${cashier.name}`}
                    className="flex items-center gap-3 px-5 py-3 text-custom-sm"
                  >
                    <span className="font-medium text-dark">
                      {cashier.name}
                    </span>
                    <span className="text-custom-xs text-body">
                      {cashier.bills} bill{cashier.bills === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto tabular-nums text-dark">
                      {formatPrice(cashier.billed)}
                    </span>
                  </li>
                ))}
                {report.byCashier.length === 0 && (
                  <li className="px-5 py-6 text-center text-custom-xs text-body">
                    No bills yet.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
              <h3 className="border-b border-gray-3 px-5 py-4 text-custom-lg font-semibold text-dark">
                Best sellers at the counter
              </h3>
              <ul className="divide-y divide-gray-2">
                {report.topProducts.map((product) => (
                  <li
                    key={product.name}
                    className="flex items-center gap-3 px-5 py-3 text-custom-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-dark">
                      {product.name}
                    </span>
                    <span className="text-custom-xs text-body">
                      ×{product.quantity}
                    </span>
                    <span className="w-28 text-right tabular-nums text-dark">
                      {formatPrice(product.revenue)}
                    </span>
                  </li>
                ))}
                {report.topProducts.length === 0 && (
                  <li className="px-5 py-6 text-center text-custom-xs text-body">
                    Nothing sold yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

      <SaleDetailDialog
        saleId={openSaleId}
        canVoid={canVoid}
        onClose={() => setOpenSaleId(null)}
        onChanged={load}
      />
    </div>
  );
};

export default PosSalesTab;
