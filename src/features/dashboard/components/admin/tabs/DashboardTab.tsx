"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import { getMonthlyReportSummary } from "@/features/dashboard/api/dashboard-api";
import { Toast } from "@/lib/utils/toast";
import type { ReportExportPayload } from "@/features/reports/types/report";
import {
  exportReportExcel,
  exportReportPdf,
} from "@/lib/utils/reportExport";
import RecentOrdersCard from "../dashboard/RecentOrdersCard";
import TopProductsCard from "../dashboard/TopProductsCard";
import OutOfStockCard from "../dashboard/OutOfStockCard";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, FileText } from "lucide-react";
import { useGetDashboardQuery } from "@/store/services/api";

type DashboardTabProps = {
  dateRange: string;
};

const DashboardTab: React.FC<DashboardTabProps> = ({ dateRange }) => {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch: refetchDashboard,
  } = useGetDashboardQuery(
    { dateRange },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      refetchOnMountOrArgChange: false,
    }
  );

  const loadDashboardData = useCallback(() => {
    refetchDashboard();
  }, [refetchDashboard]);

  useEffect(() => {
    if (!error) return;
    const message =
      (error as any)?.data?.message ||
      (error as any)?.data ||
      (error as any)?.error ||
      "Failed to load dashboard data";
    Toast.error(message);
  }, [error]);

  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [appliedReport, setAppliedReport] = useState<{
    mode: "month" | "range";
    month?: string;
    startDate?: string;
    endDate?: string;
  }>({
    mode: "month",
    month: (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })(),
  });
  const [isApplyingReport, setIsApplyingReport] = useState(false);
  const [reportData, setReportData] = useState<ReportExportPayload | null>(null);

  useEffect(() => {
    setReportData(null);
  }, [reportMonth, reportStartDate, reportEndDate]);

  const handleApplyReportRange = () => {
    if (isApplyingReport) return;
    const hasRange = !!reportStartDate || !!reportEndDate;
    if ((reportStartDate && !reportEndDate) || (!reportStartDate && reportEndDate)) {
      Toast.error("Select both start and end dates for a custom range.");
      return;
    }

    if (!hasRange && !reportMonth) {
      Toast.error("Select a month or date range to apply.");
      return;
    }

    setIsApplyingReport(true);
    const toastId = Toast.loading("Fetching report data...");

    const payload = hasRange
      ? { startDate: reportStartDate, endDate: reportEndDate }
      : { month: reportMonth };

    getMonthlyReportSummary(payload)
      .then((response) => {
        setAppliedReport(
          hasRange
            ? {
                mode: "range",
                startDate: reportStartDate,
                endDate: reportEndDate,
              }
            : { mode: "month", month: reportMonth }
        );
        setReportData(response.reportData || null);
        Toast.update(toastId, {
          render: "Report data ready.",
          type: "success",
          isLoading: false,
          autoClose: 2500,
        });
      })
      .catch((err: any) => {
        Toast.update(toastId, {
          render:
            err?.response?.data?.message ||
            err?.message ||
            "Failed to fetch report data.",
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      })
      .finally(() => {
        setIsApplyingReport(false);
      });
  };

  const handleDownloadReport = async (format: "excel" | "pdf") => {
    let toastId: string | number | null = null;
    try {
      if (!reportData) {
        Toast.error("Apply a report range before downloading.");
        return;
      }
      if (appliedReport.mode === "range") {
        if (!appliedReport.startDate || !appliedReport.endDate) {
          Toast.error("Apply a valid date range before downloading.");
          return;
        }
      } else if (!appliedReport.month) {
        Toast.error("Apply a month before downloading.");
        return;
      }

      toastId = Toast.loading(`Generating ${format.toUpperCase()} report...`);

      const blob =
        format === "pdf"
          ? await exportReportPdf(reportData)
          : await exportReportExcel(reportData);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileLabel =
        appliedReport.mode === "range"
          ? `${appliedReport.startDate}_to_${appliedReport.endDate}`
          : appliedReport.month;
      link.download = `${
        appliedReport.mode === "range" ? "report" : "monthly-report"
      }-${fileLabel}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Toast.dismiss(toastId);
      Toast.success(`${format.toUpperCase()} report downloaded successfully!`);
    } catch (err: any) {
      if (toastId !== null) Toast.dismiss(toastId);
      console.error("Failed to download report:", err);
      Toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to download report. Please try again."
      );
    }
  };

  const formatPrice = (price: number) =>
    `Rs ${new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;

  const metrics = useMemo(
    () => [
      {
        label: "Total revenue",
        value: dashboardData
          ? formatPrice(dashboardData.metrics.revenue.total)
          : "Rs 0.00",
        change: dashboardData?.metrics.revenue.change,
        direction: dashboardData?.metrics.revenue.direction,
        caption: "vs previous period",
      },
      {
        label: "Orders completed",
        value: dashboardData?.metrics.orders.total || 0,
        change: dashboardData?.metrics.orders.change,
        direction: dashboardData?.metrics.orders.direction,
        caption: "this month",
      },
      {
        label: "Total customers",
        value: dashboardData?.metrics.customers.total || 0,
        change: dashboardData?.metrics.customers.change,
        direction: dashboardData?.metrics.customers.direction,
        caption: "registered users",
      },
      {
        label: "Total products",
        value: dashboardData?.metrics.products.total || 0,
        caption: `${
          dashboardData?.metrics.products.lowStock || 0
        } low stock items`,
      },
    ],
    [dashboardData]
  );

  const rangeLabel = useMemo(() => {
    switch (dateRange) {
      case "7":
        return "last 7 days";
      case "30":
        return "last 30 days";
      case "90":
        return "last 90 days";
      case "365":
        return "last 12 months";
      default:
        return "selected period";
    }
  }, [dateRange]);

  return (
    <div className="space-y-4 w-full overflow-hidden">
      {/* Metrics */}
      <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm px-3 py-2 md:px-4 md:py-3 min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] uppercase text-body tracking-wide truncate">
                  {metric.label}
                </p>
                <p className="mt-1 text-lg sm:text-xl md:text-2xl font-semibold text-dark leading-tight break-words">
                  {metric.value}
                </p>
              </div>

              {!!metric.change && !!metric.direction && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold shrink-0 ${
                    metric.direction === "up"
                      ? "bg-green-light-6 text-green"
                      : "bg-red-light-6 text-red"
                  }`}
                >
                  {metric.direction === "up" ? (
                    <svg
                      className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M7 2L12 7H8V12H6V7H2L7 2Z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg
                      className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 12L2 7H6V2H8V7H12L7 12Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                  {metric.change}
                </span>
              )}
            </div>

            <p className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-body truncate">
              {metric.caption} • {rangeLabel}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4 min-w-0">
          <RecentOrdersCard
            orders={dashboardData?.recentOrders || []}
            isLoading={isLoading}
          />
          <OutOfStockCard
            products={dashboardData?.outOfStockProducts || []}
            isLoading={isLoading}
          />

          {/* Reports (compact, consistent buttons) */}
          <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm overflow-hidden">
            <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm md:text-base font-semibold text-dark">
                  Monthly Reports
                </h3>
                <p className="text-[11px] md:text-xs text-body truncate">
                  Download comprehensive sales reports
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-9 w-full sm:w-auto shrink-0"
                onClick={loadDashboardData}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <div className="px-3 py-2 md:px-4 md:py-3">
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-body">Month</label>
                    <input
                      type="month"
                      value={reportMonth}
                      onChange={(event) => setReportMonth(event.target.value)}
                      className="h-9 rounded-md border border-gray-3 bg-gray-2 px-3 text-xs text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-body">Start date</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(event) => setReportStartDate(event.target.value)}
                      className="h-9 rounded-md border border-gray-3 bg-gray-2 px-3 text-xs text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-body">End date</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(event) => setReportEndDate(event.target.value)}
                      className="h-9 rounded-md border border-gray-3 bg-gray-2 px-3 text-xs text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full sm:w-auto text-xs sm:text-sm"
                  disabled={isApplyingReport}
                  onClick={handleApplyReportRange}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full sm:w-auto text-xs sm:text-sm"
                  disabled={
                    !reportData ||
                    (appliedReport.mode === "range"
                      ? !appliedReport.startDate || !appliedReport.endDate
                      : !appliedReport.month)
                  }
                  onClick={() => handleDownloadReport("excel")}
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Excel report
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full sm:w-auto text-xs sm:text-sm"
                  disabled={
                    !reportData ||
                    (appliedReport.mode === "range"
                      ? !appliedReport.startDate || !appliedReport.endDate
                      : !appliedReport.month)
                  }
                  onClick={() => handleDownloadReport("pdf")}
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  PDF report
                </Button>
              </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red bg-red-light-6 px-3 py-2 md:px-4 md:py-3">
              <p className="text-xs md:text-sm text-red font-medium break-words">
                {(error as any)?.data?.message ||
                  (error as any)?.data ||
                  (error as any)?.error ||
                  "Failed to load dashboard data"}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <TopProductsCard
            products={dashboardData?.topProducts || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
