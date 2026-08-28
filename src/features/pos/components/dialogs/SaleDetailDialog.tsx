"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  Loader2,
  Printer,
  RotateCcw,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toast } from "@/lib/utils/toast";
import { formatPrice } from "@/lib/utils/price";
import {
  addSalePayment,
  getSaleById,
  returnSaleItems,
  voidSale,
} from "@/features/pos/api/pos-api";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Sale,
} from "@/features/pos/types/pos";
import { roundMoney, savedLineTotal } from "@/features/pos/utils/bill";

type SaleDetailDialogProps = {
  saleId: number | null;
  canVoid: boolean;
  onClose: () => void;
  onChanged: () => void;
};

type Mode = "detail" | "payment" | "return" | "void";

const lineName = (item: Sale["items"][number]) =>
  item.title || item.product?.title || "Item";

/**
 * One bill, and everything that can still happen to it: collect the balance,
 * take items back, or cancel it outright.
 */
const SaleDetailDialog: React.FC<SaleDetailDialogProps> = ({
  saleId,
  canVoid,
  onClose,
  onChanged,
}) => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("detail");

  // Collect a balance
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payReference, setPayReference] = useState("");
  const [payDueDate, setPayDueDate] = useState("");

  // Return items
  const [returnQty, setReturnQty] = useState<Record<number, number>>({});
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [restock, setRestock] = useState(true);
  const [returnReason, setReturnReason] = useState("");

  // Cancel the bill
  const [voidReason, setVoidReason] = useState("");

  const load = React.useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    try {
      setSale(await getSaleById(saleId));
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "That bill could not be opened");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [saleId, onClose]);

  useEffect(() => {
    if (!saleId) {
      setSale(null);
      return;
    }
    setMode("detail");
    setPayAmount("");
    setPayMethod("CASH");
    setPayReference("");
    setPayDueDate("");
    setReturnQty({});
    setRefundAmount("");
    setRestock(true);
    setReturnReason("");
    setVoidReason("");
    void load();
  }, [saleId, load]);

  const balance = sale ? roundMoney(Math.max(0, sale.totalAmount - sale.amountPaid)) : 0;
  // After a return the customer can have paid more than the bill now comes to.
  // The money is in the drawer, so the shop owes it back  said plainly here
  // rather than hidden behind a "settled" badge.
  const overCollected = sale
    ? roundMoney(Math.max(0, sale.amountPaid - sale.totalAmount))
    : 0;

  // How the promise date reads at the counter: a date, or how late it is.
  const dueLabel = sale?.balanceDueDate
    ? new Date(sale.balanceDueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : "";
  const daysLate = sale?.balanceDueDate
    ? Math.floor(
        (Date.now() - new Date(sale.balanceDueDate).getTime()) / 86_400_000,
      )
    : 0;

  // What the server will allow back: the units coming back, less their share
  // of the line's own discount and of the discount given on the whole bill.
  // Suggesting more than that would only earn the cashier a rejection.
  const returnValue = useMemo(() => {
    if (!sale) return 0;

    const grossReturned = roundMoney(
      sale.items.reduce((sum, item) => {
        const quantity = returnQty[item.id] || 0;
        if (quantity <= 0) return sum;
        const unit = item.discountedPrice ?? item.price;
        const share =
          item.quantity > 0
            ? (item.lineDiscount || 0) * (quantity / item.quantity)
            : 0;
        return sum + unit * quantity - share;
      }, 0),
    );

    const billDiscountShare =
      sale.subtotal > 0
        ? roundMoney(sale.discountAmount * (grossReturned / sale.subtotal))
        : 0;

    return roundMoney(Math.max(0, grossReturned - billDiscountShare));
  }, [sale, returnQty]);

  useEffect(() => {
    if (mode !== "return") return;
    // Default the refund to what came back, capped at what was actually paid.
    setRefundAmount(
      String(Math.min(returnValue, sale ? roundMoney(sale.amountPaid) : 0).toFixed(2)),
    );
  }, [returnValue, mode, sale]);

  if (!saleId) return null;

  const handleAddPayment = async () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Toast.error("Enter the amount collected");
      return;
    }

    setBusy(true);
    try {
      const updated = await addSalePayment(saleId, {
        method: payMethod,
        amount,
        reference: payReference.trim() || undefined,
        // Only meaningful when this payment does not clear the balance: the
        // customer says when they will bring the rest.
        balanceDueDate: payDueDate || undefined,
      });
      setSale(updated);
      setMode("detail");
      setPayAmount("");
      setPayReference("");
      Toast.success("Payment recorded");
      onChanged();
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "That payment could not be recorded",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async () => {
    const items = Object.entries(returnQty)
      .map(([itemId, quantity]) => ({ itemId: Number(itemId), quantity }))
      .filter((row) => row.quantity > 0);

    if (items.length === 0) {
      Toast.error("Choose what is coming back");
      return;
    }

    setBusy(true);
    try {
      const updated = await returnSaleItems(saleId, {
        items,
        refundAmount: Number(refundAmount) || 0,
        refundMethod,
        restock,
        reason: returnReason.trim() || undefined,
      });
      setSale(updated);
      setMode("detail");
      setReturnQty({});
      Toast.success("Return recorded");
      onChanged();
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "That return could not be recorded",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (voidReason.trim().length < 3) {
      Toast.error("Say why the bill is being cancelled");
      return;
    }

    setBusy(true);
    try {
      const updated = await voidSale(saleId, voidReason.trim());
      setSale(updated);
      setMode("detail");
      Toast.success("Bill cancelled and stock put back");
      onChanged();
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message || "That bill could not be cancelled",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!saleId} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-gray-3 bg-gray-2 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate font-mono text-custom-sm text-blue">
                {sale?.orderNumber ?? "Loading…"}
              </DialogTitle>
              <DialogDescription>
                {sale
                  ? `${new Date(sale.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}${sale.createdBy?.name ? ` · ${sale.createdBy.name}` : ""}`
                  : "Opening the bill…"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {sale && (
                <Link
                  href={`/admin/pos/receipt/${sale.id}`}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 bg-gray-1 px-3 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:text-blue"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Link>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-dark-4 transition hover:bg-gray-1 hover:text-dark"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading || !sale ? (
            <div className="flex items-center justify-center gap-2 py-16 text-custom-sm text-body">
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening the bill…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gray-3 bg-gray-1 px-2.5 py-0.5 text-[11px] font-medium text-dark">
                  {PAYMENT_STATUS_LABELS[sale.paymentStatus]}
                </span>
                {sale.voidedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red/20 bg-red-light-6 px-2.5 py-0.5 text-[11px] font-medium text-red">
                    <Ban className="h-3 w-3" />
                    Cancelled
                  </span>
                )}
                <span className="text-custom-xs text-body">
                  {sale.billingName}
                  {sale.billingPhone ? ` · ${sale.billingPhone}` : ""}
                </span>
                {balance > 0.01 && sale.balanceDueDate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      daysLate > 0
                        ? "border-red/20 bg-red-light-6 text-red"
                        : "border-blue/20 bg-blue-light-5 text-blue"
                    }`}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {daysLate > 0
                      ? `${daysLate} day${daysLate === 1 ? "" : "s"} late`
                      : `Due ${dueLabel}`}
                  </span>
                )}
              </div>

              {sale.voidReason && (
                <p className="mt-3 rounded-lg border border-red/20 bg-red-light-6 px-3 py-2 text-custom-xs text-red">
                  {sale.voidReason}
                </p>
              )}

              <ul className="mt-4 divide-y divide-gray-2 rounded-xl border border-gray-3">
                {sale.items.map((item) => {
                  const remaining = item.quantity - item.returnedQty;
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 text-custom-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-dark">
                          {lineName(item)}
                        </p>
                        <p className="text-custom-xs text-body">
                          {item.color ? `${item.color} · ` : ""}
                          {item.quantity} × {formatPrice(item.discountedPrice ?? item.price)}
                          {item.returnedQty > 0
                            ? ` · ${item.returnedQty} returned`
                            : ""}
                        </p>
                      </div>

                      {mode === "return" && !sale.voidedAt && remaining > 0 && (
                        <label className="flex items-center gap-2 text-custom-xs text-body">
                          Return
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            value={returnQty[item.id] ?? 0}
                            onChange={(event) =>
                              setReturnQty((current) => ({
                                ...current,
                                [item.id]: Math.max(
                                  0,
                                  Math.min(remaining, Number(event.target.value) || 0),
                                ),
                              }))
                            }
                            className="h-8 w-16 text-right text-custom-sm tabular-nums"
                          />
                          <span>of {remaining}</span>
                        </label>
                      )}

                      <span className="w-24 text-right font-medium tabular-nums text-dark">
                        {formatPrice(savedLineTotal(item))}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <dl className="mt-4 flex flex-col gap-1.5 rounded-xl border border-gray-3 bg-gray-1 p-4 text-custom-sm">
                <div className="flex justify-between text-body">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(sale.subtotal)}</dd>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-body">
                    <dt>Discount</dt>
                    <dd className="tabular-nums">
                      − {formatPrice(sale.discountAmount)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-3 pt-2 font-semibold text-dark">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPrice(sale.totalAmount)}</dd>
                </div>
                <div className="flex justify-between text-body">
                  <dt>Collected</dt>
                  <dd className="tabular-nums">{formatPrice(sale.amountPaid)}</dd>
                </div>
                {balance > 0.01 && (
                  <div className="flex justify-between font-semibold text-red">
                    <dt>Balance due</dt>
                    <dd className="tabular-nums">{formatPrice(balance)}</dd>
                  </div>
                )}
                {overCollected > 0.01 && (
                  <div className="flex justify-between font-semibold text-yellow-dark">
                    <dt>Owed back to the customer</dt>
                    <dd className="tabular-nums">{formatPrice(overCollected)}</dd>
                  </div>
                )}
              </dl>

              {sale.payments && sale.payments.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {sale.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border border-gray-3 px-3 py-2 text-custom-xs"
                    >
                      <span className="text-body">
                        {payment.amount < 0 ? "Refund" : "Payment"} ·{" "}
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </span>
                      <span
                        className={`font-medium tabular-nums ${
                          payment.amount < 0 ? "text-red" : "text-dark"
                        }`}
                      >
                        {formatPrice(payment.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* ------------------------------------------------ collect */}
              {mode === "payment" && (
                <div className="mt-4 rounded-xl border border-blue/30 bg-blue-light-5 p-4">
                  <h3 className="text-custom-sm font-semibold text-dark">
                    Collect the balance
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Input
                      autoFocus
                      value={payAmount}
                      onChange={(event) => setPayAmount(event.target.value)}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={balance.toFixed(2)}
                      className="h-10 text-right text-custom-sm tabular-nums"
                      aria-label="Amount collected"
                    />
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger className="h-10 text-custom-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={payReference}
                      onChange={(event) => setPayReference(event.target.value)}
                      placeholder="Reference (optional)"
                      className="h-10 text-custom-sm"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPayAmount(balance.toFixed(2))}
                      className="rounded-full border border-blue/30 bg-gray-2 px-3 py-1 text-custom-xs font-medium text-blue"
                    >
                      Full balance · {formatPrice(balance)}
                    </button>
                  </div>

                  {/* Part payment: the customer says when they will bring the
                      rest, and the counter chases from that date. */}
                  {Number(payAmount) > 0 && Number(payAmount) < balance - 0.01 && (
                    <label className="mt-3 block">
                      <span className="text-custom-xs text-body">
                        When will they bring the rest?
                      </span>
                      <Input
                        type="date"
                        value={payDueDate}
                        onChange={(event) => setPayDueDate(event.target.value)}
                        className="mt-1 h-10 text-custom-sm"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* ------------------------------------------------- return */}
              {mode === "return" && (
                <div className="mt-4 rounded-xl border border-gray-3 bg-gray-1 p-4">
                  <h3 className="text-custom-sm font-semibold text-dark">
                    Take items back
                  </h3>
                  <p className="mt-1 text-custom-xs text-body">
                    Set the quantity against each line above. The bill total drops
                    by {formatPrice(returnValue)}.
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-custom-xs text-body">Refund now</span>
                      <Input
                        value={refundAmount}
                        onChange={(event) => setRefundAmount(event.target.value)}
                        type="number"
                        min={0}
                        step="0.01"
                        className="mt-1 h-10 text-right text-custom-sm tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="text-custom-xs text-body">Refund by</span>
                      <Select value={refundMethod} onValueChange={setRefundMethod}>
                        <SelectTrigger className="mt-1 h-10 text-custom-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="block">
                      <span className="text-custom-xs text-body">Reason</span>
                      <Input
                        value={returnReason}
                        onChange={(event) => setReturnReason(event.target.value)}
                        placeholder="Wrong size"
                        className="mt-1 h-10 text-custom-sm"
                      />
                    </label>
                  </div>

                  <label className="mt-3 flex items-start gap-2 text-custom-sm text-dark">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={(event) => setRestock(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-4 text-blue focus:ring-blue"
                    />
                    <span>
                      Put the items back into stock
                      <span className="block text-custom-xs text-body">
                        Leave this off if they came back damaged.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {/* --------------------------------------------------- void */}
              {mode === "void" && (
                <div className="mt-4 rounded-xl border border-red/20 bg-red-light-6 p-4">
                  <h3 className="text-custom-sm font-semibold text-red">
                    Cancel this bill
                  </h3>
                  <p className="mt-1 text-custom-xs text-red">
                    Stock goes back on the shelf and any money taken is reversed.
                    The bill stays on record, marked cancelled.
                  </p>
                  <Input
                    autoFocus
                    value={voidReason}
                    onChange={(event) => setVoidReason(event.target.value)}
                    placeholder="Why is it being cancelled?"
                    className="mt-3 h-10 text-custom-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 border-t border-gray-3 bg-gray-2 px-6 py-4 sm:justify-start">
          {mode === "detail" ? (
            <>
              {sale && !sale.voidedAt && balance > 0.01 && (
                <Button
                  type="button"
                  onClick={() => setMode("payment")}
                  className="bg-blue hover:bg-blue-dark"
                >
                  <Wallet className="h-4 w-4" />
                  Collect {formatPrice(balance)}
                </Button>
              )}
              {sale && !sale.voidedAt && (
                <Button type="button" variant="outline" onClick={() => setMode("return")}>
                  <Undo2 className="h-4 w-4" />
                  Return items
                </Button>
              )}
              {sale && !sale.voidedAt && canVoid && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("void")}
                  className="border-red/30 text-red hover:bg-red-light-6 hover:text-red sm:ml-auto"
                >
                  <Ban className="h-4 w-4" />
                  Cancel bill
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setMode("detail")}>
                <RotateCcw className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={
                  mode === "payment"
                    ? handleAddPayment
                    : mode === "return"
                      ? handleReturn
                      : handleVoid
                }
                className={`sm:ml-auto ${
                  mode === "void"
                    ? "bg-red hover:bg-red-dark"
                    : "bg-blue hover:bg-blue-dark"
                }`}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "payment"
                  ? "Record payment"
                  : mode === "return"
                    ? "Record return"
                    : "Cancel the bill"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailDialog;
