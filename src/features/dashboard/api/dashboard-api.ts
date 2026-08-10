import axiosInstance from "@/lib/axiosInstance";
import type { DashboardData } from "@/features/dashboard/types/dashboard";
import type { ReportExportPayload } from "@/features/reports/types/report";

export type GetDashboardParams = {
  // optional: keep this if you want to send dateRange to backend
  // (backend can ignore it if not used)
  dateRange?: string;
};

/**
 * Raw request (no dedupe)
 */
export const getDashboardData = async (
  params?: GetDashboardParams
): Promise<DashboardData> => {
  const response = await axiosInstance.get("/dashboard", {
    params,
    timeout: 30000,
  });
  return response.data?.data ?? response.data;
};

/**
 * Dedupe GET requests:
 * - If React StrictMode runs effects twice in dev, the 2nd call reuses the same promise
 * - If user clicks refresh quickly while request is in-flight, still only 1 network call
 */
const dashboardInFlight = new Map<string, Promise<DashboardData>>();

export const getDashboardDataOnce = (params?: GetDashboardParams) => {
  const key = JSON.stringify(params ?? {});

  const existing = dashboardInFlight.get(key);
  if (existing) return existing;

  const p = getDashboardData(params).finally(() => {
    dashboardInFlight.delete(key);
  });

  dashboardInFlight.set(key, p);
  return p;
};

export const getMonthlyReport = async (params: {
  month?: string;
  startDate?: string;
  endDate?: string;
  format: "excel" | "pdf";
}): Promise<Blob> => {
  const response = await axiosInstance.get("/dashboard/reports/monthly", {
    params,
    responseType: "blob",
    timeout: 60000,
  });
  return response.data;
};

export const getMonthlyReportSummary = async (params: {
  month?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ reportData: ReportExportPayload }> => {
  const response = await axiosInstance.get("/dashboard/reports/monthly", {
    params: { ...params, format: "json" },
    timeout: 30000,
  });
  return response.data;
};
