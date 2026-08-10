import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { handleError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import {
  buildReportPayload,
  fetchReportDataset,
  generateExcelReportForRange,
  generatePDFReportForRange,
} from "@/features/reports/services/report-service";

type CachedReport = {
  dataset: Awaited<ReturnType<typeof fetchReportDataset>>;
  expiresAt: number;
};

const reportCache = new Map<string, CachedReport>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const format = searchParams.get("format") || "excel";

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return new Response(
        JSON.stringify({ error: "Both startDate and endDate are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid startDate or endDate" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (start > end) {
        return new Response(
          JSON.stringify({ error: "startDate must be before endDate" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      rangeStart = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
        0,
        0,
        0
      );
      rangeEnd = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
        23,
        59,
        59
      );
    }

    const buildMonthRange = (value: string) => {
      const [year, monthNum] = value.split("-").map(Number);
      const start = new Date(year, monthNum - 1, 1, 0, 0, 0);
      const end = new Date(year, monthNum, 0, 23, 59, 59);
      return { start, end };
    };

    const rangeLabel =
      startDate && endDate ? `${startDate}_to_${endDate}` : month;

    const reportRange =
      startDate && endDate && rangeStart && rangeEnd
        ? {
            startDate: rangeStart,
            endDate: rangeEnd,
            label: rangeLabel,
            isCustomRange: true,
          }
        : (() => {
            const monthRange = buildMonthRange(month);
            return {
              startDate: monthRange.start,
              endDate: monthRange.end,
              label: rangeLabel,
              isCustomRange: false,
            };
          })();

    const cacheKey = JSON.stringify({
      month: month || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const getCachedDataset = () => {
      const cached = reportCache.get(cacheKey);
      if (!cached) return null;
      if (cached.expiresAt < Date.now()) {
        reportCache.delete(cacheKey);
        return null;
      }
      return cached.dataset;
    };

    const storeDataset = (dataset: Awaited<ReturnType<typeof fetchReportDataset>>) => {
      reportCache.set(cacheKey, {
        dataset,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return dataset;
    };

    if (format === "json") {
      const dataset =
        getCachedDataset() ?? storeDataset(await fetchReportDataset(reportRange));
      const reportData = buildReportPayload(reportRange, dataset);
      return new Response(JSON.stringify({ type: "json", reportData }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (format === "pdf") {
      const dataset =
        getCachedDataset() ?? storeDataset(await fetchReportDataset(reportRange));

      buffer = await generatePDFReportForRange(reportRange, dataset);
      contentType = "application/pdf";
      filename =
        startDate && endDate
          ? `report-${rangeLabel}.pdf`
          : `monthly-report-${month}.pdf`;
    } else {
      const dataset =
        getCachedDataset() ?? storeDataset(await fetchReportDataset(reportRange));

      buffer = await generateExcelReportForRange(reportRange, dataset);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename =
        startDate && endDate
          ? `report-${rangeLabel}.xlsx`
          : `monthly-report-${month}.xlsx`;
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    logger.error("Report generation error", serializeError(error));
    return handleError(error);
  }
}
