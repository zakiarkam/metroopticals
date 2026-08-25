import { NextRequest } from "next/server";
import { reportQuerySchema } from "@/features/reports/validators/reports";
import { requireSuperAdmin } from "@/lib/middleware/auth";
import { handleError } from "@/lib/errors";
import { logger, serializeError } from "@/lib/logger";
import {
  buildReportPayload,
  fetchReportDataset,
  generateExcelReportForRange,
  generatePDFReportForRange,
  resolveReportRange,
} from "@/features/reports/services/report-service";

type CachedReport = {
  dataset: Awaited<ReturnType<typeof fetchReportDataset>>;
  expiresAt: number;
};

const reportCache = new Map<string, CachedReport>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = reportQuerySchema.parse({
      ...Object.fromEntries(searchParams),
      format: searchParams.get("format") || "excel",
    });
    const month = parsed.month || "";
    const startDate = parsed.startDate || "";
    const endDate = parsed.endDate || "";
    const format = parsed.format;

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return new Response(
        JSON.stringify({ error: "Both startDate and endDate are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (startDate && endDate && startDate > endDate) {
      return new Response(
        JSON.stringify({ error: "startDate must be before endDate" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    const reportRange = resolveReportRange({
      month: month || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      format,
    });
    const rangeLabel = reportRange.label;

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
      // Bound the in-process cache so varied date ranges can't grow it forever.
      if (reportCache.size >= 50) {
        const oldestKey = reportCache.keys().next().value;
        if (oldestKey !== undefined) reportCache.delete(oldestKey);
      }
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
          : `monthly-report-${rangeLabel}.pdf`;
    } else {
      const dataset =
        getCachedDataset() ?? storeDataset(await fetchReportDataset(reportRange));

      buffer = await generateExcelReportForRange(reportRange, dataset);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename =
        startDate && endDate
          ? `report-${rangeLabel}.xlsx`
          : `monthly-report-${rangeLabel}.xlsx`;
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
