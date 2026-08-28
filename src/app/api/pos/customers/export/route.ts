import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/middleware/auth";
import { handleError } from "@/lib/errors";
import { getCustomersForExport } from "@/features/pos/services/pos-customer-service";
import { logApiAction, logApiError } from "@/lib/audit";

/**
 * The customer book as a spreadsheet.
 *
 * `?optedInOnly=true` gives the marketing list: only people who ticked yes to
 * offers. The default export is the whole book, for the shop's own records.
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    await requireAdmin();
    const optedInOnly = request.nextUrl.searchParams.get("optedInOnly") === "true";
    const customers = await getCustomersForExport(optedInOnly);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Metro Opticals";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(optedInOnly ? "Marketing list" : "Customer book", {
      properties: { tabColor: { argb: "FF8F6A37" } },
    });
    sheet.columns = [
      { header: "Name", key: "name", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 28 },
      { header: "City", key: "city", width: 16 },
      { header: "Address", key: "address", width: 34 },
      { header: "Offers OK", key: "optIn", width: 10 },
      { header: "Bills", key: "bills", width: 8 },
      { header: "Spent (Rs)", key: "spent", width: 14 },
      { header: "Owes (Rs)", key: "owed", width: 12 },
      { header: "Last visit", key: "lastVisit", width: 14 },
      { header: "First seen", key: "firstSeen", width: 14 },
      { header: "Notes", key: "notes", width: 34 },
    ];
    const head = sheet.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8F6A37" } };
    head.height = 20;

    customers.forEach((customer) => {
      sheet.addRow({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        city: customer.city || "",
        address: customer.address || "",
        optIn: customer.marketingOptIn ? "Yes" : "No",
        bills: customer.stats.bills,
        spent: customer.stats.spent,
        owed: customer.stats.owed,
        lastVisit: customer.lastVisitAt
          ? customer.lastVisitAt.toLocaleDateString("en-GB")
          : "",
        firstSeen: customer.createdAt.toLocaleDateString("en-GB"),
        notes: customer.notes || "",
      });
    });
    sheet.getColumn("H").numFmt = "#,##0.00";
    sheet.getColumn("I").numFmt = "#,##0.00";
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "L1" };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await logApiAction({
      request,
      status: 200,
      durationMs: Date.now() - start,
      action: optedInOnly ? "pos_marketing_list_export" : "pos_customer_book_export",
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${
          optedInOnly ? "marketing-list" : "customer-book"
        }-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await logApiError(error, { request, durationMs: Date.now() - start });
    return handleError(error);
  }
}
