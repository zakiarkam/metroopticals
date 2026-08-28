import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError } from "@/lib/errors";
import { saleQuerySchema } from "@/features/pos/validators/pos";
import { buildSalesWorkbook } from "@/features/pos/services/pos-export-service";
import { logApiAction, logApiError } from "@/lib/audit";

/** The sales list as a spreadsheet, filtered exactly as it is on screen. */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const query = saleQuerySchema.parse(
      Object.fromEntries(searchParams.entries()),
    );

    const { buffer, filename } = await buildSalesWorkbook(query);

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: "pos_sales_export",
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
