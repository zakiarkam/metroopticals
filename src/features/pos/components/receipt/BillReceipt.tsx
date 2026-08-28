"use client";

import React from "react";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/utils/price";
import {
  roundMoney,
  savedLineTotal,
  savedLineUnitPrice,
} from "@/features/pos/utils/bill";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Sale,
} from "@/features/pos/types/pos";

export type BusinessDetails = {
  legalName: string;
  registrationNumber?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  invoiceNote?: string;
};

export const FALLBACK_BUSINESS: BusinessDetails = {
  legalName: siteConfig.legalName,
  address: siteConfig.contact.address,
  phone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  website: siteConfig.domain,
  invoiceNote: "Thank you for shopping with Metro Opticals.",
};

export type ReceiptLayout = "thermal" | "a4";

type BillReceiptProps = {
  sale: Sale;
  business: BusinessDetails;
  layout: ReceiptLayout;
};

const billDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const lineName = (item: Sale["items"][number]) =>
  item.title || item.product?.title || "Item";

const unitCharged = (item: Sale["items"][number]) => savedLineUnitPrice(item);

/**
 * The printed bill.
 *
 * One component, two paper sizes: an 80mm roll for the counter printer and an
 * A4 invoice for anyone who asks for a proper one. Sharing the markup means the
 * two can never drift into saying different things about the same sale.
 *
 * Everything here is plain CSS rather than Tailwind's palette, because it has
 * to survive `@media print`, where the browser drops backgrounds and colours.
 */
const BillReceipt: React.FC<BillReceiptProps> = ({ sale, business, layout }) => {
  const thermal = layout === "thermal";
  // The items row is the sum of the printed line totals, so the column the
  // customer can add up themselves is the number the bill then works from.
  const itemsTotal = roundMoney(
    sale.items.reduce((sum, item) => sum + savedLineTotal(item), 0),
  );
  // Returns lower the stored subtotal but leave the lines as they were sold,
  // so the difference between the two is what came back  shown as its own
  // row rather than left as an unexplained gap in the arithmetic.
  const returnedValue = roundMoney(itemsTotal - sale.subtotal);
  const collections = (sale.payments || []).filter((p) => p.amount > 0);
  const refunds = (sale.payments || []).filter((p) => p.amount < 0);
  const balance = roundMoney(Math.max(0, sale.totalAmount - sale.amountPaid));
  const returned = sale.items.some((item) => item.returnedQty > 0);

  return (
    <div id="bill-print" className={`bill ${thermal ? "bill--thermal" : "bill--a4"}`}>
      <style>{`
        .bill {
          background: #ffffff;
          color: #1B1713;
          font-family: ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace;
          margin: 0 auto;
        }
        .bill--thermal { width: 80mm; padding: 6mm 5mm; font-size: 11px; line-height: 1.45; }
        .bill--a4 {
          width: 190mm; padding: 0; font-size: 12px; line-height: 1.5;
          font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
        }
        .bill h1 { font-size: ${thermal ? "15px" : "22px"}; margin: 0; letter-spacing: 0.02em; }
        .bill .muted { color: #6F6555; }
        .bill .center { text-align: center; }
        .bill .right { text-align: right; }
        .bill .rule { border: 0; border-top: 1px dashed #D3C9B8; margin: 8px 0; }
        .bill .rule--solid { border-top: 1px solid #1B1713; }
        .bill table { width: 100%; border-collapse: collapse; }
        .bill th, .bill td { padding: ${thermal ? "2px 0" : "7px 8px"}; vertical-align: top; }
        .bill th {
          text-align: left; font-size: ${thermal ? "10px" : "10.5px"};
          text-transform: uppercase; letter-spacing: 0.06em; color: #6F6555;
          border-bottom: 1px solid #D3C9B8;
        }
        .bill .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .bill .totals td { padding: ${thermal ? "1px 0" : "4px 8px"}; }
        .bill .grand td { font-size: ${thermal ? "14px" : "15px"}; font-weight: 700; padding-top: 6px; }
        .bill .balance td { color: #9E1F24; font-weight: 700; }
        .bill .badge {
          display: inline-block; border: 1px solid #1B1713; border-radius: 3px;
          padding: 1px 6px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .bill .foot { margin-top: 10px; font-size: ${thermal ? "10px" : "11px"}; }

        /* ---- A4 invoice chrome ------------------------------------------ */
        /* The same document as the website invoice: charcoal header, gold
           rule, three-column parties, black table head, right-hand totals,
           a payment panel with a gold edge. */
        .bill--a4 .masthead {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
          background: #1A1A1A; color: #FFFFFF; padding: 26px 30px 22px;
          border-bottom: 4px solid #8F6A37;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .bill--a4 .masthead img { height: 96px; width: auto; display: block; }
        .bill--a4 .masthead h1 { color: #FFFFFF; font-size: 30px; font-weight: 800; letter-spacing: 0.01em; margin: 0; }
        .bill--a4 .masthead .muted { color: #C8C8C8; font-size: 12px; margin: 0; }
        .bill--a4 .masthead .meta { margin-top: 10px; }
        .bill--a4 .masthead .meta strong { color: #FFFFFF; font-weight: 600; }
        .bill--a4 .masthead .status {
          color: #8F6A37; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 6px;
        }
        .bill--a4 .body { padding: 26px 30px 30px; }
        .bill--a4 .parties { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #E1DDD6; }
        .bill--a4 .label {
          color: #8F6A37; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; margin: 0 0 5px;
        }
        .bill--a4 .parties p { margin: 0; font-size: 11.5px; line-height: 1.5; color: #6E6E6E; }
        .bill--a4 .parties p.name { color: #242424; font-weight: 700; font-size: 13px; }
        .bill--a4 thead th {
          background: #1A1A1A; color: #FFFFFF; border: 0; font-size: 10.5px; letter-spacing: 0.02em; text-transform: none;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .bill--a4 thead th.num { text-align: right; }
        .bill--a4 tbody td { border-bottom: 1px solid #E1DDD6; padding: 12px 8px; font-size: 12px; }
        .bill--a4 tbody td.num:last-child { font-weight: 700; }
        .bill--a4 .totals { width: 78mm; margin-left: auto; margin-top: 12px; }
        .bill--a4 .totals td { padding: 4px 8px; font-size: 12px; color: #6E6E6E; }
        .bill--a4 .totals td.num { color: #242424; font-weight: 700; }
        .bill--a4 .totals .grand td { border-top: 2px solid #1A1A1A; padding-top: 10px; font-size: 15px; color: #242424; }
        .bill--a4 .totals .grand td.num { font-size: 19px; }
        .bill--a4 .totals .balance td { color: #9E1F24; }
        .bill--a4 .totals .balance td.num { color: #9E1F24; }
        .bill--a4 .totals .discount td.num { color: #228B54; }
        .bill--a4 .panel {
          margin-top: 28px; background: #F8F6F2; border-left: 4px solid #8F6A37; border-radius: 6px; padding: 18px 22px;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .bill--a4 .panel .row { display: flex; gap: 18px; align-items: baseline; margin-bottom: 8px; }
        .bill--a4 .panel .label { margin: 0; min-width: 72px; }
        .bill--a4 .panel .value { font-weight: 700; color: #242424; font-size: 12.5px; }
        .bill--a4 .panel p.due { color: #9E1F24; font-weight: 700; font-size: 12px; margin: 0 0 6px; }
        .bill--a4 .panel p.note { color: #6E6E6E; font-size: 11.5px; margin: 8px 0 0; line-height: 1.5; }
        .bill--a4 .foot { border-top: 1px solid #E1DDD6; padding-top: 12px; margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
        .bill--a4 .foot strong { display: block; color: #242424; font-size: 12px; }
        .bill--a4 .rule { display: none; }

        @media print {
          .bill { width: auto; padding: ${thermal ? "0 2mm" : "0"}; }
          .bill--a4 .masthead { border-radius: 0; }
        }
      `}</style>

      {thermal ? (
        <header className="center">
          <h1>{business.legalName}</h1>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            {business.address}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {business.phone}
            {business.email ? ` · ${business.email}` : ""}
          </p>
          {business.registrationNumber && (
            <p className="muted" style={{ margin: 0 }}>
              Reg. no. {business.registrationNumber}
            </p>
          )}
        </header>
      ) : (
        <header className="masthead">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- print
                markup; next/image's lazy loading would leave a blank box on
                the printed page */}
            <img src={siteConfig.logoOnDark} alt={business.legalName} />
          </div>
          <div className="right">
            <h1>INVOICE</h1>
            <div className="meta">
              <p className="muted">
                Invoice no.&nbsp;&nbsp;<strong>{sale.orderNumber}</strong>
              </p>
              <p className="muted">
                Date&nbsp;&nbsp;
                <strong>
                  {new Date(sale.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </p>
            </div>
            <p className="status" style={sale.voidedAt ? { color: "#E05A5F" } : undefined}>
              {sale.voidedAt
                ? "Cancelled"
                : PAYMENT_STATUS_LABELS[sale.paymentStatus] ?? sale.paymentStatus}
            </p>
          </div>
        </header>
      )}

      <div className={thermal ? undefined : "body"}>
      {thermal ? (
        <>
          <hr className="rule rule--solid" />
          <div>
            <p style={{ margin: 0 }}>
              <strong>Bill</strong> {sale.orderNumber}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {billDate(sale.createdAt)}
            </p>
            {sale.createdBy?.name && (
              <p className="muted" style={{ margin: 0 }}>
                Served by {sale.createdBy.name}
              </p>
            )}
            <p style={{ margin: "6px 0 0" }}>
              <strong>{sale.billingName}</strong>
            </p>
            {sale.billingPhone && (
              <p className="muted" style={{ margin: 0 }}>
                {sale.billingPhone}
              </p>
            )}
            {sale.billingAddress && (
              <p className="muted" style={{ margin: 0 }}>
                {sale.billingAddress}
                {sale.billingCity ? `, ${sale.billingCity}` : ""}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="parties">
          <div>
            <p className="label">From</p>
            <p className="name">{business.legalName}</p>
            {business.registrationNumber && <p>Reg. no. {business.registrationNumber}</p>}
            <p>{business.address}</p>
            <p>{business.phone}</p>
            {business.email && <p>{business.email}</p>}
            {business.website && <p>{business.website}</p>}
          </div>
          <div>
            <p className="label">Bill to</p>
            <p className="name">{sale.billingName || "Walk-in customer"}</p>
            {sale.billingAddress && <p>{sale.billingAddress}</p>}
            {sale.billingCity && <p>{sale.billingCity}</p>}
            {sale.billingPhone && <p>{sale.billingPhone}</p>}
            {sale.billingEmail && <p>{sale.billingEmail}</p>}
          </div>
          <div>
            <p className="label">Sale</p>
            <p className="name">Walk-in · shop counter</p>
            {sale.createdBy?.name && <p>Served by {sale.createdBy.name}</p>}
            <p>
              {collections.length === 0
                ? "Nothing collected yet"
                : `Paid by ${Array.from(
                    new Set(
                      collections.map((p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method),
                    ),
                  ).join(", ")}`}
            </p>
            {sale.status === "PROCESSING" && <p>Awaiting collection</p>}
          </div>
        </div>
      )}

      {sale.voidedAt && (
        <p className="center" style={{ marginTop: "8px" }}>
          <span className="badge">Cancelled</span>
        </p>
      )}

      <hr className="rule" />

      <table>
        <thead>
          <tr>
            {!thermal && <th style={{ width: 28 }}>#</th>}
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">{thermal ? "Price" : "Unit price"}</th>
            <th className="num">{thermal ? "Total" : "Amount"}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={item.id}>
              {!thermal && <td className="muted">{index + 1}</td>}
              <td>
                {lineName(item)}
                {item.color ? (
                  <span className="muted"> · {item.color}</span>
                ) : null}
                {item.lineDiscount > 0 && (
                  <span className="muted">
                    {" "}
                    · {formatPrice(item.lineDiscount)} off
                  </span>
                )}
                {item.returnedQty > 0 && (
                  <span className="muted"> · {item.returnedQty} returned</span>
                )}
              </td>
              <td className="num">{item.quantity}</td>
              <td className="num">{unitCharged(item).toFixed(2)}</td>
              <td className="num">{savedLineTotal(item).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="rule" />

      <table className="totals">
        <tbody>
          <tr>
            <td className="muted">Items</td>
            <td className="num">{formatPrice(itemsTotal)}</td>
          </tr>
          {returnedValue > 0.01 && (
            <>
              <tr>
                <td className="muted">Returned</td>
                <td className="num">− {formatPrice(returnedValue)}</td>
              </tr>
              <tr>
                <td className="muted">Subtotal</td>
                <td className="num">{formatPrice(sale.subtotal)}</td>
              </tr>
            </>
          )}
          {sale.discountAmount > 0 && (
            <tr className="discount">
              <td className="muted">Discount</td>
              <td className="num">− {formatPrice(sale.discountAmount)}</td>
            </tr>
          )}
          <tr className="grand">
            <td>Total</td>
            <td className="num">{formatPrice(sale.totalAmount)}</td>
          </tr>

          {collections.map((payment) => (
            <tr key={payment.id}>
              <td className="muted">
                Paid · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                {payment.reference ? ` (${payment.reference})` : ""}
              </td>
              <td className="num">{formatPrice(payment.amount)}</td>
            </tr>
          ))}

          {refunds.map((payment) => (
            <tr key={payment.id}>
              <td className="muted">Refunded</td>
              <td className="num">− {formatPrice(Math.abs(payment.amount))}</td>
            </tr>
          ))}

          {balance > 0.01 && (
            <tr className="balance">
              <td>
                Balance due
                {sale.balanceDueDate
                  ? ` by ${new Date(sale.balanceDueDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}`
                  : ""}
              </td>
              <td className="num">{formatPrice(balance)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {sale.notes && (
        <>
          <hr className="rule" />
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{sale.notes}</p>
        </>
      )}

      <hr className="rule" />

      {thermal ? (
        <div className="foot center">
          {balance > 0.01 && (
            <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
              {sale.balanceDueDate
                ? `Please bring this bill on or before ${new Date(
                    sale.balanceDueDate,
                  ).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })} to settle the balance and collect.`
                : "Please bring this bill when you collect and settle the balance."}
            </p>
          )}
          {returned && (
            <p className="muted" style={{ margin: "0 0 4px" }}>
              Returned items are shown against their line above.
            </p>
          )}
          <p style={{ margin: 0 }}>
            {business.invoiceNote || FALLBACK_BUSINESS.invoiceNote}
          </p>
          {business.website && (
            <p className="muted" style={{ margin: "2px 0 0" }}>
              {business.website}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="row">
              <p className="label">Payment</p>
              <span className="value">
                {collections.length === 0
                  ? "NOT YET PAID"
                  : Array.from(
                      new Set(
                        collections.map(
                          (p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method,
                        ),
                      ),
                    )
                      .join(" + ")
                      .toUpperCase()}
              </span>
            </div>
            {balance > 0.01 && (
              <p className="due">
                {sale.balanceDueDate
                  ? `Balance of ${formatPrice(balance)} to be settled by ${new Date(
                      sale.balanceDueDate,
                    ).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}.`
                  : `Balance of ${formatPrice(balance)} to be settled on collection.`}
              </p>
            )}
            {sale.status === "PROCESSING" && (
              <p className="note" style={{ marginTop: 0 }}>
                Your order is being prepared. Please bring this invoice when you
                collect.
              </p>
            )}
            <p className="note">{business.invoiceNote || FALLBACK_BUSINESS.invoiceNote}</p>
          </div>

          <div className="foot">
            <div>
              <strong>{business.legalName}</strong>
              <span className="muted">
                {[business.phone, business.email, business.website]
                  .filter(Boolean)
                  .join("   ·   ")}
              </span>
            </div>
            <span className="muted">Page 1 of 1</span>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default BillReceipt;
