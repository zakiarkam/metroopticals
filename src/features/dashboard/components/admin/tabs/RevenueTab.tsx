"use client";
import React, { useMemo } from "react";

type RevenueTabProps = {
  dateRange: string;
};

const RevenueTab: React.FC<RevenueTabProps> = ({ dateRange }) => {
  const metrics = useMemo(
    () => [
      {
        label: "Gross revenue",
        value: "Rs 184,920",
        helper: "+14.3% vs prior",
        badge: "bg-blue-light-5 text-blue",
      },
      {
        label: "Net revenue",
        value: "Rs 162,470",
        helper: "After refunds & fees",
        badge: "bg-green-light-6 text-green",
      },
      {
        label: "Subscription revenue",
        value: "Rs 38,120",
        helper: "21% of total",
        badge: "bg-yellow-light-4 text-yellow-dark",
      },
      {
        label: "Avg order value",
        value: "Rs 142.30",
        helper: "+Rs 6.10 uplift",
        badge: "bg-red-light-6 text-red",
      },
    ],
    []
  );

  const monthly = useMemo(
    () => [
      { month: "Feb", revenue: 42800, target: 40000 },
      { month: "Mar", revenue: 45210, target: 42000 },
      { month: "Apr", revenue: 46890, target: 44500 },
      { month: "May", revenue: 49560, target: 47000 },
      { month: "Jun", revenue: 51240, target: 49000 },
      { month: "Jul", revenue: 53820, target: 51500 },
    ],
    []
  );

  const maxRevenue = useMemo(
    () => Math.max(...monthly.map((item) => item.revenue)),
    [monthly]
  );

  const channelSplit = useMemo(
    () => [
      {
        label: "Online store",
        value: "Rs 92,430",
        percent: 50,
        color: "bg-blue",
      },
      {
        label: "Mobile app",
        value: "Rs 48,260",
        percent: 26,
        color: "bg-green",
      },
      {
        label: "Marketplaces",
        value: "Rs 26,110",
        percent: 14,
        color: "bg-yellow-dark",
      },
      {
        label: "Retail partners",
        value: "Rs 18,120",
        percent: 10,
        color: "bg-orange",
      },
    ],
    []
  );

  const costBreakdown = useMemo(
    () => [
      {
        label: "Cost of goods",
        spend: "Rs 64,220",
        change: "+6.2%",
        badge: "bg-yellow-light-4 text-yellow-dark",
      },
      {
        label: "Logistics",
        spend: "Rs 24,980",
        change: "+3.8%",
        badge: "bg-blue-light-5 text-blue",
      },
      {
        label: "Marketing",
        spend: "Rs 18,540",
        change: "-4.1%",
        badge: "bg-green-light-6 text-green",
      },
      {
        label: "Customer support",
        spend: "Rs 9,880",
        change: "+1.2%",
        badge: "bg-gray-2 text-dark-3",
      },
    ],
    []
  );

  const rangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7":
        return "week to date";
      case "30":
        return "last 30 days";
      case "90":
        return "quarter to date";
      default:
        return "last 12 months";
    }
  }, [dateRange]);

  return (
    <div className="space-y-7.5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 p-5"
          >
            <p className="text-custom-xs uppercase text-body tracking-wide">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-dark">
              {metric.value}
            </p>
            <span
              className={`mt-3 inline-flex w-fit rounded-full px-3 py-1 text-custom-xs font-medium ${metric.badge}`}
            >
              {metric.helper}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-7.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-5 py-4">
            <div>
              <h3 className="text-custom-lg font-semibold text-dark">
                Revenue performance
              </h3>
              <p className="text-custom-xs text-body">
                Monthly revenue vs targets  -  {rangeLabel}
              </p>
            </div>
            <button className="rounded-md border border-gray-3 bg-gray-1 px-3 py-2 text-custom-xs font-medium text-dark hover:border-blue hover:text-blue">
              Download CSV
            </button>
          </div>

          <div className="grid gap-7.5 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex items-end gap-5 border-r border-gray-3 pr-5">
              {monthly.map((item) => {
                const height = (item.revenue / maxRevenue) * 180;
                const targetHeight = (item.target / maxRevenue) * 180;

                return (
                  <div
                    key={item.month}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div className="flex h-48 w-full flex-col justify-end gap-2">
                      <div
                        className="mx-auto h-full w-9 rounded-lg bg-blue/10"
                        style={{ height: `${targetHeight}px` }}
                      >
                        <div
                          className="w-full rounded-lg bg-blue"
                          style={{ height: `${height}px` }}
                        />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-custom-xs font-medium text-dark">
                        {item.month}
                      </p>
                      <p className="text-custom-xs text-body">
                        {`Rs ${Intl.NumberFormat("en-LK", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(item.revenue)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 text-custom-sm text-dark">
              <div className="rounded-lg border border-gray-3 bg-gray-1 px-4 py-3">
                <p className="font-medium">Run rate</p>
                <p className="text-custom-xs text-body">
                  On pace for{" "}
                  <span className="font-semibold text-dark">Rs 612K</span>{" "}
                  this quarter.
                </p>
              </div>
              <div className="rounded-lg border border-gray-3 px-4 py-3">
                <p className="font-medium">Return rate</p>
                <p className="text-custom-xs text-body">
                  1.9% of revenue refunded, below your 3% threshold.
                </p>
              </div>
              <div className="rounded-lg border border-gray-3 px-4 py-3">
                <p className="font-medium">Recurring revenue</p>
                <p className="text-custom-xs text-body">
                  Subscription MRR up{" "}
                  <span className="font-semibold text-green">+9.5%</span> vs
                  last month.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-7.5">
          <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 p-5">
            <div className="mb-5">
              <h3 className="text-custom-lg font-semibold text-dark">
                Channel breakdown
              </h3>
              <p className="text-custom-xs text-body">
                Contribution to net revenue.
              </p>
            </div>
            <div className="space-y-4">
              {channelSplit.map((channel) => (
                <div key={channel.label}>
                  <div className="flex items-center justify-between text-custom-sm text-dark">
                    <span>{channel.label}</span>
                    <span className="font-semibold">{channel.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-2 overflow-hidden border border-gray-3">
                    <div
                      className={`h-full ${channel.color}`}
                      style={{ width: `${channel.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-custom-xs text-body">
                    {channel.percent}% share
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 p-5">
            <div className="mb-5">
              <h3 className="text-custom-lg font-semibold text-dark">
                Cost distribution
              </h3>
              <p className="text-custom-xs text-body">
                Track spending to maintain healthy margins.
              </p>
            </div>
            <div className="space-y-4">
              {costBreakdown.map((cost) => (
                <div
                  key={cost.label}
                  className="flex items-start justify-between rounded-lg border border-gray-3 px-4 py-3"
                >
                  <div>
                    <p className="text-custom-sm font-medium text-dark">
                      {cost.label}
                    </p>
                    <p className="text-custom-xs text-body">{cost.spend}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-custom-xs font-medium ${cost.badge}`}
                  >
                    {cost.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1 p-5">
        <div className="mb-5">
          <h3 className="text-custom-lg font-semibold text-dark">
            Top regions
          </h3>
          <p className="text-custom-xs text-body">
            Geographic performance across major markets.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 text-custom-sm text-dark">
          {[
            {
              region: "United States",
              revenue: "Rs 94,320",
              growth: "+12.4%",
              badge: "bg-blue-light-5 text-blue",
            },
            {
              region: "Canada",
              revenue: "Rs 22,410",
              growth: "+6.2%",
              badge: "bg-green-light-6 text-green",
            },
            {
              region: "EU",
              revenue: "Rs 28,950",
              growth: "+9.8%",
              badge: "bg-yellow-light-4 text-yellow-dark",
            },
            {
              region: "APAC",
              revenue: "Rs 16,790",
              growth: "+11.1%",
              badge: "bg-red-light-6 text-red",
            },
          ].map((region) => (
            <div
              key={region.region}
              className="rounded-lg border border-gray-3 p-4 hover:border-blue transition"
            >
              <p className="font-medium">{region.region}</p>
              <p className="mt-1 text-custom-xs text-body">
                {region.revenue}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-custom-xs font-medium ${region.badge}`}
              >
                {region.growth}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RevenueTab;
