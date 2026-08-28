"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, MessageCircle, Plus, Printer } from "lucide-react";
import { Toast } from "@/lib/utils/toast";
import { formatPrice } from "@/lib/utils/price";
import { getSaleById } from "@/features/pos/api/pos-api";
import type { Sale } from "@/features/pos/types/pos";
import { downloadBillPdf } from "@/features/pos/utils/bill-pdf";
import { savedLineTotal } from "@/features/pos/utils/bill";
import BillReceipt, {
  FALLBACK_BUSINESS,
  type BusinessDetails,
  type ReceiptLayout,
} from "@/features/pos/components/receipt/BillReceipt";

/**
 * The printable bill.
 *
 * Arriving with `?print=1` (which is how the till sends the cashier here the
 * moment a sale is saved) opens the print dialog by itself, so completing a
 * sale and handing over the paper is one action rather than three.
 */
const ReceiptPage = () => {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const saleId = Number(params?.id);

  const [sale, setSale] = useState<Sale | null>(null);
  const [business, setBusiness] = useState<BusinessDetails>(FALLBACK_BUSINESS);
  const [layout, setLayout] = useState<ReceiptLayout>("thermal");
  const [loading, setLoading] = useState(true);
  const autoPrint = searchParams?.get("print") === "1";

  useEffect(() => {
    if (!Number.isInteger(saleId) || saleId <= 0) {
      Toast.error("That bill number is not valid");
      setLoading(false);
      return;
    }

    let active = true;
    getSaleById(saleId)
      .then((result) => {
        if (active) setSale(result);
      })
      .catch((error: any) => {
        Toast.error(
          error?.response?.data?.message || "That bill could not be opened",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [saleId]);

  useEffect(() => {
    fetch("/api/site-content/business.details", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const block = payload?.data?.block ?? payload?.block;
        if (block) setBusiness({ ...FALLBACK_BUSINESS, ...block });
      })
      .catch(() => {
        // The shipped details are printed instead; the bill still goes out.
      });
  }, []);

  useEffect(() => {
    if (!sale || !autoPrint) return;
    // One frame for the receipt to lay out before the browser snapshots it.
    const timer = setTimeout(() => window.print(), 350);
    return () => clearTimeout(timer);
  }, [sale, autoPrint]);

  const whatsappHref = useMemo(() => {
    if (!sale) return null;
    const phone = (sale.billingPhone || sale.customer?.phone || "").replace(/\D/g, "");
    if (!phone) return null;

    // Sri Lankan numbers are typed as 07x locally; wa.me needs the country code.
    const international = phone.startsWith("94")
      ? phone
      : `94${phone.replace(/^0+/, "")}`;

    const balance = Math.max(0, sale.totalAmount - sale.amountPaid);
    const lines = [
      `*${business.legalName}*`,
      `Bill ${sale.orderNumber}`,
      "",
      ...sale.items.map(
        (item) =>
          `${item.title || item.product?.title || "Item"} × ${item.quantity} — ${formatPrice(
            savedLineTotal(item),
          )}`,
      ),
      "",
      `Total: ${formatPrice(sale.totalAmount)}`,
      `Paid: ${formatPrice(sale.amountPaid)}`,
      ...(balance > 0.01 ? [`Balance: ${formatPrice(balance)}`] : []),
      "",
      "Thank you for your visit.",
    ];

    return `https://wa.me/${international}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [sale, business.legalName]);

  return (
    <section className="min-h-screen bg-gray-1 py-4 sm:py-8">
      <style>{`
        @media print {
          /* Zero page margin on purpose: the browser prints its own header
             and footer  the date, the page title, localhost URLs  into the
             margin, so no margin means none of that on a customer's bill.
             The breathing room comes from the bill's own padding instead. */
          @page { size: ${layout === "thermal" ? "80mm auto" : "A4"}; margin: 0; }
          body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          #bill-print, #bill-print * { visibility: visible !important; }
          #bill-print { position: absolute; left: 0; top: 0; width: 100% !important; }
          #bill-print.bill--a4 .body,
          #bill-print.bill--a4 .foot { padding-left: 12mm; padding-right: 12mm; }
          #bill-print.bill--thermal { padding: 4mm 5mm !important; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
          <Link
            href="/admin/pos/sales"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-3 text-custom-xs font-medium text-dark transition hover:bg-gray-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Sales
          </Link>

          <div className="flex h-9 items-center rounded-full border border-gray-3 bg-gray-2 p-1">
            {(["thermal", "a4"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLayout(option)}
                className={`h-7 rounded-full px-3 text-custom-xs font-medium transition ${
                  layout === option
                    ? "bg-blue-light-5 text-blue"
                    : "text-body hover:text-dark"
                }`}
              >
                {option === "thermal" ? "80mm roll" : "A4 invoice"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-green/30 bg-green-light-6 px-3 text-custom-xs font-medium text-green transition hover:bg-green-light-5"
              >
                <MessageCircle className="h-4 w-4" />
                Send on WhatsApp
              </a>
            )}
            <button
              type="button"
              disabled={!sale}
              onClick={() => {
                if (!sale) return;
                downloadBillPdf(sale, business).catch(() => {
                  Toast.error("The PDF could not be created. Try printing instead.");
                });
              }}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-3 text-custom-xs font-medium text-dark transition hover:bg-gray-3 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/pos")}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-2 px-3 text-custom-xs font-medium text-dark transition hover:bg-gray-3"
            >
              <Plus className="h-4 w-4" />
              New bill
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!sale}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-blue px-4 text-custom-xs font-semibold text-white transition hover:bg-blue-dark disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        <div className="flex justify-center rounded-xl border border-gray-3 bg-gray-2 p-4 shadow-1 print:border-0 print:bg-white print:p-0 print:shadow-none sm:p-8">
          {loading ? (
            <p className="py-16 text-custom-sm text-body">Opening the bill…</p>
          ) : sale ? (
            <BillReceipt sale={sale} business={business} layout={layout} />
          ) : (
            <p className="py-16 text-custom-sm text-body">
              That bill could not be found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReceiptPage;
