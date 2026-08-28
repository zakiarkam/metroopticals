"use client";

import React, { useMemo, useState } from "react";
import type { DailyRevenue } from "@/features/dashboard/types/dashboard";

type RevenueTrendCardProps = {
  data: DailyRevenue[];
  isLoading?: boolean;
  rangeLabel: string;
};

/**
 * Takings per day, split by where the sale happened.
 *
 * Stacked because the two channels add up to one day's money — the shop asks
 * "what did we take" first and "how much of it was over the counter" second.
 *
 * The two hues are the brand gold and the palette's purple: distinct enough to
 * tell apart with any kind of colour vision (ΔE 24 normal, 24 protan), and both
 * carry a legend and a direct label so identity never rests on colour alone.
 */
const COUNTER = "#8F6A37";
const WEBSITE = "#6D45B8";

const money = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(value)}`;

const shortDay = (key: string) =>
  new Date(key).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/** A month of bars is readable; a year of them is a smear, so weeks are shown. */
const bucket = (data: DailyRevenue[]) => {
  if (data.length <= 45) {
    return data.map((row) => ({ ...row, label: shortDay(row.date), span: 1 }));
  }

  const weeks: Array<DailyRevenue & { label: string; span: number }> = [];
  for (let index = 0; index < data.length; index += 7) {
    const slice = data.slice(index, index + 7);
    const first = slice[0];
    weeks.push({
      date: first.date,
      label: shortDay(first.date),
      span: slice.length,
      online: slice.reduce((sum, row) => sum + row.online, 0),
      counter: slice.reduce((sum, row) => sum + row.counter, 0),
      total: slice.reduce((sum, row) => sum + row.total, 0),
      orders: slice.reduce((sum, row) => sum + row.orders, 0),
    });
  }
  return weeks;
};

const RevenueTrendCard: React.FC<RevenueTrendCardProps> = ({
  data,
  isLoading,
  rangeLabel,
}) => {
  const [hover, setHover] = useState<number | null>(null);

  const bars = useMemo(() => bucket(data), [data]);
  const peak = useMemo(
    () => bars.reduce((max, row) => Math.max(max, row.total), 0),
    [bars],
  );
  const peakIndex = useMemo(
    () => bars.findIndex((row) => row.total === peak && peak > 0),
    [bars, peak],
  );

  const totals = useMemo(
    () => ({
      counter: bars.reduce((sum, row) => sum + row.counter, 0),
      online: bars.reduce((sum, row) => sum + row.online, 0),
    }),
    [bars],
  );
  const combined = totals.counter + totals.online;
  const weekly = bars.some((row) => row.span > 1);
  const active = hover === null ? null : bars[hover] ?? null;

  return (
    <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-3 px-3 py-2.5 md:px-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-dark">
            Takings {weekly ? "per week" : "per day"}
          </h3>
          <p className="text-[11px] text-body">
            {active
            ? `${money(active.total)} · ${active.orders} sale${
                active.orders === 1 ? "" : "s"
              }`
            : `${money(combined)} over the ${rangeLabel}`}
          </p>
        </div>

        {/* Legend, doubling as the hover readout: identity never rests on
            colour alone, and reading the values in place beats a floating
            tooltip that would have to overlap the card to be seen. */}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-body">
          {active && (
            <span className="font-semibold text-dark">
              {active.label}
              {active.span > 1 ? ` + ${active.span - 1}d` : ""}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: COUNTER }}
              aria-hidden="true"
            />
            Walk-in {money(active ? active.counter : totals.counter)}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: WEBSITE }}
              aria-hidden="true"
            />
            Website {money(active ? active.online : totals.online)}
          </span>
        </div>
      </div>

      <div className="px-3 py-3 md:px-4">
        {isLoading ? (
          <div className="h-[168px] animate-pulse rounded-lg bg-gray-1" />
        ) : peak <= 0 ? (
          <div className="flex h-[168px] flex-col items-center justify-center gap-1 text-center">
            <p className="text-custom-sm font-medium text-dark">
              No sales in this period
            </p>
            <p className="text-[11px] text-body">
              Bills written at the counter and orders from the website both
              appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="relative flex h-[168px] items-end gap-[3px]">
              {/* Recessive grid: quarters of the peak, behind the bars. */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3].map((line) => (
                  <div key={line} className="border-t border-gray-2" />
                ))}
              </div>

              {bars.map((row, index) => {
                // 92% of the plot, leaving room above the tallest bar for its
                // label instead of letting the label sit on the mark.
                const height = peak > 0 ? (row.total / peak) * 92 : 0;
                const counterShare =
                  row.total > 0 ? (row.counter / row.total) * 100 : 0;
                const isActive = hover === index;

                return (
                  <button
                    key={row.date}
                    type="button"
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    className="group relative flex h-full flex-1 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-1"
                    aria-label={`${row.label}: ${money(row.total)} in total, ${money(
                      row.counter,
                    )} walk-in, ${money(row.online)} on the website`}
                  >
                    {/* The segments are flex bases rather than fixed heights,
                        so the 2px gap between them comes out of the bar
                        instead of pushing it past the top of the plot. */}
                    <span
                      className="flex w-full flex-col justify-end gap-[2px] overflow-hidden rounded-t-[4px] transition-opacity"
                      style={{
                        height: `${Math.max(height, row.total > 0 ? 2 : 0)}%`,
                        opacity: hover === null || isActive ? 1 : 0.55,
                      }}
                    >
                      {row.online > 0 && (
                        <span
                          className="w-full min-h-0 rounded-t-[4px]"
                          style={{
                            background: WEBSITE,
                            flexBasis: `${100 - counterShare}%`,
                          }}
                        />
                      )}
                      {row.counter > 0 && (
                        <span
                          className="w-full min-h-0"
                          style={{ background: COUNTER, flexBasis: `${counterShare}%` }}
                        />
                      )}
                    </span>

                    {/* Only the busiest bar is labelled  a number on every
                        bar is noise, and the rest are read by hovering. */}
                    {index === peakIndex && hover === null && (
                      <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-1 px-1.5 py-0.5 text-[9px] font-semibold text-dark">
                        {money(row.total)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-body">
              <span>{bars[0]?.label}</span>
              <span>{bars[bars.length - 1]?.label}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RevenueTrendCard;
