"use client";

import React from "react";
import Link from "next/link";
import { Banknote, Receipt, ScanLine, Wallet } from "lucide-react";
import type { CounterToday, OutstandingSummary } from "@/features/dashboard/types/dashboard";

type CounterTodayCardProps = {
  counter?: CounterToday;
  outstanding?: OutstandingSummary;
  isLoading?: boolean;
};

const money = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

/**
 * What the counter has taken today, and what is still owed to the shop.
 *
 * These are the two numbers a shop cashes up against, so they sit above
 * everything else and carry the two actions that follow from them: open the
 * till, or go and collect.
 */
const CounterTodayCard: React.FC<CounterTodayCardProps> = ({
  counter,
  outstanding,
  isLoading,
}) => {
  const tiles = [
    {
      icon: Receipt,
      label: "Bills written",
      value: String(counter?.bills ?? 0),
      caption: `${counter?.itemsSold ?? 0} item${
        (counter?.itemsSold ?? 0) === 1 ? "" : "s"
      } sold`,
      tone: "text-dark",
    },
    {
      icon: Banknote,
      label: "Cash in hand",
      value: money(counter?.cashCollected ?? 0),
      caption: `${money(counter?.collected ?? 0)} collected in all`,
      tone: "text-dark",
    },
    {
      icon: Receipt,
      label: "Billed today",
      value: money(counter?.billed ?? 0),
      caption: "Counter sales, net of returns",
      tone: "text-dark",
    },
    {
      icon: Wallet,
      label: "Money to collect",
      value: money(outstanding?.total ?? counter?.balanceDue ?? 0),
      caption: outstanding?.overdueCount
        ? `${outstanding.overdueCount} bill${
            outstanding.overdueCount === 1 ? "" : "s"
          } late · ${money(outstanding.overdueTotal)}`
        : outstanding?.count
          ? `${outstanding.count} bill${outstanding.count === 1 ? "" : "s"} open, none late`
          : "Every bill settled",
      tone: outstanding?.overdueCount ? "text-red" : "text-dark",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-3 px-3 py-2.5 md:px-4">
        <h3 className="text-sm font-semibold text-dark">Today at the counter</h3>
        <span className="text-[11px] text-body">
          {counter?.date
            ? new Date(counter.date).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "2-digit",
                month: "short",
              })
            : ""}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin/pos"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-blue px-3 text-[11px] font-semibold text-white transition hover:bg-blue-dark"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Open POS
          </Link>
          <Link
            href="/admin/pos/sales"
            className="flex h-8 items-center rounded-lg border border-gray-3 bg-gray-1 px-3 text-[11px] font-medium text-dark transition hover:bg-gray-3"
          >
            Counter sales
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className={`min-w-0 px-3 py-3 md:px-4 ${
                index % 2 === 1 ? "border-l border-gray-3" : ""
              } ${index >= 2 ? "border-t border-gray-3 md:border-t-0" : ""} ${
                index === 2 ? "md:border-l" : ""
              }`}
            >
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-body">
                <Icon className="h-3 w-3" />
                {tile.label}
              </p>
              {isLoading ? (
                <div className="mt-1.5 h-6 w-24 animate-pulse rounded bg-gray-1" />
              ) : (
                <p
                  className={`mt-1 text-lg font-semibold leading-tight md:text-xl ${tile.tone}`}
                >
                  {tile.value}
                </p>
              )}
              <p className="mt-0.5 truncate text-[11px] text-body" title={tile.caption}>
                {tile.caption}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CounterTodayCard;
