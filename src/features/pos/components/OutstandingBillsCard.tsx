"use client";

import React, { useMemo, useState } from "react";
import { CalendarClock, MessageCircle, TriangleAlert, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils/price";
import { siteConfig } from "@/config/site";
import type { OutstandingBill } from "@/features/pos/api/pos-api";

type OutstandingBillsCardProps = {
  bills: OutstandingBill[];
  summary: {
    count: number;
    total: number;
    overdueCount: number;
    overdueTotal: number;
    dueToday: number;
  };
  loading?: boolean;
  onOpen: (saleId: number) => void;
};

const dayLabel = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "No date given";

/** A wa.me link with a polite reminder already typed out. */
const reminderHref = (bill: OutstandingBill) => {
  const digits = (bill.phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("94")
    ? digits
    : `94${digits.replace(/^0+/, "")}`;

  const lines = [
    `Hello ${bill.customer},`,
    "",
    `This is a friendly reminder from ${siteConfig.legalName} about bill ${bill.orderNumber}.`,
    `Balance to settle: ${formatPrice(bill.balance)}`,
    ...(bill.dueDate
      ? [
          `Agreed date: ${new Date(bill.dueDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}`,
        ]
      : []),
    ...(bill.awaitingCollection ? ["Your order is ready to collect."] : []),
    "",
    "Thank you.",
  ];

  return `https://wa.me/${international}?text=${encodeURIComponent(lines.join("\n"))}`;
};

/**
 * The credit book.
 *
 * The shop takes an advance, orders the lenses, and the customer comes back to
 * settle. This is the list that makes that habit chaseable: who owes what,
 * when they promised, and who is late  with the reminder already written.
 */
const OutstandingBillsCard: React.FC<OutstandingBillsCardProps> = ({
  bills,
  summary,
  loading,
  onOpen,
}) => {
  const [overdueOnly, setOverdueOnly] = useState(false);

  const rows = useMemo(
    () => (overdueOnly ? bills.filter((bill) => bill.overdue) : bills),
    [bills, overdueOnly],
  );

  return (
    <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-1">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-3 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-custom-lg font-semibold text-dark">
            <Wallet className="h-4 w-4 text-blue" />
            Money to collect
          </h3>
          <p className="text-custom-xs text-body">
            {summary.count === 0
              ? "Every counter bill is settled"
              : `${summary.count} bill${summary.count === 1 ? "" : "s"} · ${formatPrice(
                  summary.total,
                )} outstanding`}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {summary.dueToday > 0 && (
            <span className="rounded-full border border-blue/20 bg-blue-light-5 px-2.5 py-1 text-custom-xs font-medium text-blue">
              {summary.dueToday} due today
            </span>
          )}
          {summary.overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setOverdueOnly((value) => !value)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-custom-xs font-medium transition ${
                overdueOnly
                  ? "border-red bg-red text-white"
                  : "border-red/20 bg-red-light-6 text-red hover:bg-red-light-5"
              }`}
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              {summary.overdueCount} late · {formatPrice(summary.overdueTotal)}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="px-5 py-10 text-center text-custom-sm text-body">
          Loading balances…
        </p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-custom-sm text-body">
          {overdueOnly
            ? "Nothing is late."
            : "Nothing outstanding — every bill is paid."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-2">
          {rows.map((bill) => {
            const href = reminderHref(bill);
            return (
              <li
                key={bill.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition hover:bg-gray-1"
              >
                <button
                  type="button"
                  onClick={() => onOpen(bill.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-custom-sm font-medium text-dark">
                    {bill.customer}
                    {bill.awaitingCollection && (
                      <span className="ml-2 rounded-full border border-gray-3 bg-gray-1 px-2 py-0.5 text-[10px] font-medium text-body">
                        Awaiting collection
                      </span>
                    )}
                  </p>
                  <p className="truncate font-mono text-custom-xs text-blue">
                    {bill.orderNumber}
                    {bill.phone ? <span className="text-body"> · {bill.phone}</span> : null}
                  </p>
                </button>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    bill.overdue
                      ? "border-red/20 bg-red-light-6 text-red"
                      : bill.dueDate
                        ? "border-gray-3 bg-gray-1 text-body"
                        : "border-yellow-dark/20 bg-yellow-light-4 text-yellow-dark"
                  }`}
                >
                  <CalendarClock className="h-3 w-3" />
                  {bill.overdue
                    ? `${bill.daysLate} day${bill.daysLate === 1 ? "" : "s"} late`
                    : dayLabel(bill.dueDate)}
                </span>

                <span className="text-right text-custom-xs text-body">
                  Paid {formatPrice(bill.amountPaid)} of {formatPrice(bill.totalAmount)}
                </span>

                <span className="w-28 text-right text-custom-sm font-semibold tabular-nums text-dark">
                  {formatPrice(bill.balance)}
                </span>

                <span className="flex items-center gap-1.5">
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-green/30 bg-green-light-6 p-1.5 text-green transition hover:bg-green-light-5"
                      aria-label={`Remind ${bill.customer} on WhatsApp`}
                      title="Send a reminder on WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpen(bill.id)}
                    className="rounded-lg bg-blue px-2.5 py-1.5 text-custom-xs font-semibold text-white transition hover:bg-blue-dark"
                  >
                    Collect
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default OutstandingBillsCard;
