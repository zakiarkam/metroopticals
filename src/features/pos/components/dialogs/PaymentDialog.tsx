"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarClock, CreditCard, Landmark, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils/price";
import { calculateBillTotals, roundMoney } from "@/features/pos/utils/bill";
import { shopDateKey } from "@/features/pos/utils/shop-time";
import type { PaymentMethod } from "@/features/pos/types/pos";

export type PaymentSplit = { method: PaymentMethod; amount: number; reference?: string };

type PaymentDialogProps = {
  open: boolean;
  totalAmount: number;
  /** Set when the customer has given a name and phone; a balance needs one. */
  hasCustomer: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (input: {
    payments: PaymentSplit[];
    collectLater: boolean;
    balanceDueDate?: string;
  }) => void;
};

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Bank", icon: Landmark },
];

/** Notes people actually hand over at a counter in Sri Lanka. */
const CASH_CHIPS = [500, 1000, 2000, 5000, 10000];

/** How long the shop usually gives someone to come back and settle. */
const DUE_PRESETS = [
  { label: "In 3 days", days: 3 },
  { label: "In a week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In a month", days: 30 },
];

const addDays = (days: number) =>
  shopDateKey(new Date(Date.now() + days * 86_400_000));

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  totalAmount,
  hasCustomer,
  submitting,
  onClose,
  onConfirm,
}) => {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [tendered, setTendered] = useState<string>("");
  const [reference, setReference] = useState("");
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [collectLater, setCollectLater] = useState(false);
  const [dueDate, setDueDate] = useState(addDays(7));

  useEffect(() => {
    if (!open) return;
    setMethod("CASH");
    setTendered("");
    setReference("");
    setSplits([]);
    setCollectLater(false);
    setDueDate(addDays(7));
  }, [open]);

  const splitTotal = useMemo(
    () => roundMoney(splits.reduce((sum, split) => sum + split.amount, 0)),
    [splits],
  );
  const outstanding = roundMoney(Math.max(0, totalAmount - splitTotal));

  const tenderedValue = roundMoney(Number(tendered) || 0);
  // Cash over the balance is change, not an overpayment: the bill is credited
  // with what it is owed and the difference goes back across the counter.
  const applied = Math.min(tenderedValue, outstanding);
  const change =
    method === "CASH" ? roundMoney(Math.max(0, tenderedValue - outstanding)) : 0;

  const payments: PaymentSplit[] = useMemo(() => {
    const rows = [...splits];
    if (applied > 0) {
      rows.push({ method, amount: applied, reference: reference.trim() || undefined });
    }
    return rows;
  }, [splits, applied, method, reference]);

  const totals = calculateBillTotals({
    items: [{ quantity: 1, unitPrice: totalAmount }],
    amountPaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
  });
  const balanceDue = totals.balanceDue;
  const owing = balanceDue > 0.01;
  const needsCustomer = owing && !hasCustomer;

  const addSplit = () => {
    if (applied <= 0) return;
    setSplits((current) => [
      ...current,
      { method, amount: applied, reference: reference.trim() || undefined },
    ]);
    setTendered("");
    setReference("");
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent hideClose className="flex max-h-[92vh] max-w-lg flex-col p-0 sm:p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-gray-3 bg-gray-2 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Take payment</DialogTitle>
              <DialogDescription>
                Bill total {formatPrice(totalAmount)}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-dark-4 transition hover:bg-gray-1 hover:text-dark"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((option) => {
              const Icon = option.icon;
              const active = method === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMethod(option.value)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-custom-sm font-medium transition ${
                    active
                      ? "border-blue bg-blue-light-5 text-blue"
                      : "border-gray-3 bg-gray-1 text-dark hover:border-blue/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-custom-sm font-medium text-dark">
              {method === "CASH" ? "Cash received" : "Amount"}
            </span>
            <Input
              autoFocus
              value={tendered}
              onChange={(event) => setTendered(event.target.value)}
              type="number"
              min={0}
              step="0.01"
              placeholder={outstanding.toFixed(2)}
              className="h-14 text-right text-heading-6 font-semibold tabular-nums"
            />
          </label>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTendered(outstanding.toFixed(2))}
              className="rounded-full border border-blue/30 bg-blue-light-5 px-3 py-1 text-custom-xs font-medium text-blue transition hover:bg-blue-light-4"
            >
              Exact · {formatPrice(outstanding)}
            </button>
            {method === "CASH" &&
              CASH_CHIPS.filter((note) => note >= outstanding)
                .slice(0, 3)
                .map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => setTendered(String(note))}
                    className="rounded-full border border-gray-3 bg-gray-1 px-3 py-1 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:text-blue"
                  >
                    {note.toLocaleString("en-LK")}
                  </button>
                ))}
          </div>

          {method !== "CASH" && (
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={
                method === "CARD"
                  ? "Card slip number (optional)"
                  : "Transfer reference (optional)"
              }
              className="mt-3 h-10 text-custom-sm"
            />
          )}

          {splits.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {splits.map((split, index) => (
                <li
                  key={`${split.method}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-3 bg-gray-1 px-3 py-2 text-custom-sm"
                >
                  <span className="text-dark">
                    {METHODS.find((m) => m.value === split.method)?.label ?? split.method}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium tabular-nums text-dark">
                      {formatPrice(split.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSplits((current) => current.filter((_, i) => i !== index))
                      }
                      className="text-body transition hover:text-red"
                      aria-label="Remove this payment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {outstanding > 0.01 && applied > 0 && applied < outstanding && (
            <button
              type="button"
              onClick={addSplit}
              className="mt-3 w-full rounded-lg border border-dashed border-blue/40 py-2 text-custom-xs font-medium text-blue transition hover:bg-blue-light-5"
            >
              Add this and pay the rest another way
            </button>
          )}

          <dl className="mt-4 flex flex-col gap-1.5 rounded-lg border border-gray-3 bg-gray-1 p-4 text-custom-sm">
            <div className="flex justify-between text-body">
              <dt>Paying now</dt>
              <dd className="tabular-nums">{formatPrice(totals.amountPaid)}</dd>
            </div>
            {change > 0 && (
              <div className="flex justify-between font-medium text-green">
                <dt>Change to give</dt>
                <dd className="tabular-nums">{formatPrice(change)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-3 pt-2 font-semibold text-dark">
              <dt>{owing ? "Balance to collect" : "Settled"}</dt>
              <dd className="tabular-nums">{formatPrice(balanceDue)}</dd>
            </div>
          </dl>

          {/* Paying the rest later is the normal way an optical shop works:
              advance now, lenses ordered, settle on collection. */}
          {owing && (
            <div className="mt-4 rounded-lg border border-blue bg-blue-light-5 p-4">
              <p className="flex items-center gap-2 text-custom-sm font-semibold text-dark">
                <CalendarClock className="h-4 w-4 text-blue" />
                When will they pay the balance?
              </p>
              <p className="mt-1 text-custom-xs text-body">
                Printed on the bill, and the counter chases from this date.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {DUE_PRESETS.map((preset) => {
                  const value = addDays(preset.days);
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setDueDate(value)}
                      className={`rounded-full border px-3 py-1 text-custom-xs font-medium transition ${
                        dueDate === value
                          ? "border-blue bg-blue text-white"
                          : "border-gray-3 bg-gray-2 text-dark hover:border-blue/40 hover:text-blue"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <Input
                type="date"
                value={dueDate}
                min={shopDateKey()}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-3 h-10 text-custom-sm"
                aria-label="Date the balance is due"
              />
            </div>
          )}

          <label className="mt-4 flex items-start gap-2 text-custom-sm text-dark">
            <input
              type="checkbox"
              checked={collectLater}
              onChange={(event) => setCollectLater(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-4 text-blue focus:ring-blue"
            />
            <span>
              Customer will collect later
              <span className="block text-custom-xs text-body">
                Keeps the bill in progress instead of marking it handed over.
              </span>
            </span>
          </label>

          {needsCustomer && (
            <p className="mt-3 rounded-lg border border-yellow-dark/20 bg-yellow-light-4 px-3 py-2 text-custom-xs text-yellow-dark">
              A bill with a balance needs the customer&rsquo;s name and phone
              number, so you know who owes it.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-gray-3 bg-gray-2 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Back
          </Button>
          <Button
            type="button"
            disabled={submitting || needsCustomer}
            onClick={() =>
              onConfirm({
                payments,
                collectLater,
                balanceDueDate: owing ? dueDate : undefined,
              })
            }
            className="bg-blue hover:bg-blue-dark"
          >
            {submitting ? "Saving…" : "Save & print bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
