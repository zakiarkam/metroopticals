import axiosInstance from "@/lib/axiosInstance";
import type { DashboardData } from "@/features/dashboard/types/dashboard";
import type { ReportExportPayload } from "@/features/reports/types/report";

export type GetDashboardParams = {
  dateRange?: string;
};

export const getDashboardData = async (
  params?: GetDashboardParams
): Promise<DashboardData> => {
  const response = await axiosInstance.get("/dashboard", {
    params,
    timeout: 30000,
  });
  return response.data?.data ?? response.data;
};

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
