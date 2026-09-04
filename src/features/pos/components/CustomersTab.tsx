"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BookUser,
  Download,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
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
import { getCustomers, updateCustomer } from "@/features/pos/api/pos-api";
import type { PosCustomer } from "@/features/pos/types/pos";

type Sort = "recent" | "spend" | "visits" | "name";

const lastSeen = (value?: string | null) => {
  if (!value) return "Never billed";
  const days = Math.floor(
    (Date.now() - new Date(value).getTime()) / 86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365)
    return `${Math.floor(days / 30)} month${days < 60 ? "" : "s"} ago`;
  return `${Math.floor(days / 365)} year${days < 730 ? "" : "s"} ago`;
};

const whatsappHref = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("94") ? digits : `94${digits.replace(/^0+/, "")}`}`;
};

/**
 * The customer book  everyone who has been billed at the counter.
 *
 * Separate from website accounts: these people have no login, only a name and
 * a phone number given across the counter. The "offers OK" column is the
 * marketing list, and the export of it is what a campaign is run from.
 */
const CustomersTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [optedInOnly, setOptedInOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [rows, setRows] = useState<PosCustomer[]>([]);
  const [summary, setSummary] = useState({ total: 0, optedIn: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCustomers({
        search: debounced || undefined,
        optedInOnly,
        sort,
        page,
        limit,
      });
      setRows(result.customers);
      setSummary(result.summary);
      setTotalPages(result.pagination.totalPages);
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message ||
          "The customer book could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, [debounced, optedInOnly, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleOptIn = async (customer: PosCustomer) => {
    setSavingId(customer.id);
    try {
      const updated = await updateCustomer(customer.id, {
        marketingOptIn: !customer.marketingOptIn,
      });
      setRows((current) =>
        current.map((row) =>
          row.id === customer.id ? { ...row, ...updated } : row,
        ),
      );
      setSummary((current) => ({
        ...current,
        optedIn: current.optedIn + (updated.marketingOptIn ? 1 : -1),
      }));
      Toast.success(
        updated.marketingOptIn
          ? `${customer.name} added to the marketing list`
          : `${customer.name} removed from the marketing list`,
      );
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "That change could not be saved",
      );
    } finally {
      setSavingId(null);
    }
  };

  const exportHref = `/api/pos/customers/export${optedInOnly ? "?optedInOnly=true" : ""}`;

  return (
    <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
      <div className="flex flex-wrap items-center gap-4 border-b border-gray-3 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-custom-lg font-semibold text-dark">
            <BookUser className="h-4 w-4 text-blue" />
            Customer book
          </h3>
          <p className="text-custom-xs text-body">
            {summary.total} customer{summary.total === 1 ? "" : "s"} ·{" "}
            {summary.optedIn} said yes to offers
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, phone or email"
              className="h-8 w-60 pl-10 text-custom-sm"
              aria-label="Search the customer book"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setOptedInOnly((value) => !value);
              setPage(1);
            }}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-custom-xs font-medium transition ${
              optedInOnly
                ? "border-blue bg-blue text-white"
                : "border-gray-3 bg-gray-1 text-body hover:text-dark"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Marketing list
          </button>

          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as Sort);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-custom-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent visit</SelectItem>
              <SelectItem value="spend">Highest spend</SelectItem>
              <SelectItem value="visits">Most visits</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>

          <a
            href={exportHref}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-blue px-3 text-custom-xs font-semibold text-white transition hover:bg-blue-dark"
          >
            <Download className="h-4 w-4" />
            {optedInOnly ? "Export marketing list" : "Export book"}
          </a>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[1.8fr_1.3fr_1fr_0.7fr_1fr_1fr_0.9fr_90px] gap-4 border-b border-gray-3 px-5 py-3 text-custom-xs uppercase tracking-wide text-body">
            <span>Customer</span>
            <span>Contact</span>
            <span>Last visit</span>
            <span>Bills</span>
            <span>Spent</span>
            <span>Owes</span>
            <span>Offers OK</span>
            <span>Reach</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-custom-sm text-body">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading the book…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-custom-sm text-body">
              {optedInOnly
                ? "Nobody has said yes to offers yet. Tick “OK to send offers” at the till when they agree."
                : "No customers yet. Anyone billed at the counter with a phone number appears here."}
            </div>
          ) : (
            rows.map((customer) => {
              const href = whatsappHref(customer.phone);
              return (
                <div
                  key={customer.id}
                  className="grid grid-cols-[1.8fr_1.3fr_1fr_0.7fr_1fr_1fr_0.9fr_90px] items-center gap-4 border-b border-gray-2 px-5 py-3.5 text-custom-sm transition last:border-0 hover:bg-gray-1"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-dark">
                      {customer.name}
                    </p>
                    <p className="truncate text-custom-xs text-body">
                      {[customer.city, customer.address]
                        .filter(Boolean)
                        .join(" · ") || "No address"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-dark">{customer.phone}</p>
                    <p className="truncate text-custom-xs text-body">
                      {customer.email || "-"}
                    </p>
                  </div>

                  <p className="text-custom-xs text-body">
                    {lastSeen(customer.lastVisitAt)}
                  </p>

                  <p className="tabular-nums text-dark">
                    {customer.stats?.bills ?? 0}
                  </p>

                  <p className="font-medium tabular-nums text-dark">
                    {formatPrice(customer.stats?.spent ?? 0)}
                  </p>

                  <p
                    className={`tabular-nums ${
                      (customer.stats?.owed ?? 0) > 0
                        ? "font-medium text-red"
                        : "text-body"
                    }`}
                  >
                    {(customer.stats?.owed ?? 0) > 0
                      ? formatPrice(customer.stats!.owed)
                      : "-"}
                  </p>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!customer.marketingOptIn}
                    disabled={savingId === customer.id}
                    onClick={() => toggleOptIn(customer)}
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ${
                      customer.marketingOptIn
                        ? "border-green/20 bg-green-light-6 text-green hover:bg-green-light-5"
                        : "border-gray-3 bg-gray-1 text-body hover:text-dark"
                    }`}
                    title="Click to change"
                  >
                    {savingId === customer.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    {customer.marketingOptIn ? "Yes" : "No"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-green/30 bg-green-light-6 p-1.5 text-green transition hover:bg-green-light-5"
                        aria-label={`Message ${customer.name} on WhatsApp`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    <a
                      href={`tel:${customer.phone}`}
                      className="rounded-lg border border-gray-3 bg-gray-1 px-2 py-1.5 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:text-blue"
                    >
                      Call
                    </a>
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
            totalItems={summary.total}
            itemsPerPage={limit}
            onPageChange={setPage}
            showItemsPerPage={false}
          />
        </div>
      )}
    </div>
  );
};

export default CustomersTab;
