"use client";

import React from "react";
import { PauseCircle, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/price";
import { calculateBillTotals } from "@/features/pos/utils/bill";
import type { HeldBill } from "@/features/pos/hooks/use-pos-cart";

type HeldBillsDialogProps = {
  open: boolean;
  bills: HeldBill[];
  onClose: () => void;
  onResume: (id: string) => void;
  onDiscard: (id: string) => void;
};

/**
 * Bills parked mid-sale  a customer who went to fetch their card, or a second
 * customer served while the first decides. Parked in this browser only, so
 * they belong to the till they were started on.
 */
const HeldBillsDialog: React.FC<HeldBillsDialogProps> = ({
  open,
  bills,
  onClose,
  onResume,
  onDiscard,
}) => (
  <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent hideClose className="flex max-h-[85vh] max-w-lg flex-col p-0 sm:p-0">
      <DialogHeader className="sticky top-0 z-10 border-b border-gray-3 bg-gray-2 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle>Held bills</DialogTitle>
            <DialogDescription>
              Parked on this computer until you come back to them.
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
        {bills.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <PauseCircle className="h-7 w-7 text-gray-4" />
            <p className="text-custom-sm font-medium text-dark">Nothing on hold</p>
            <p className="text-custom-xs text-body">
              Use Hold to park a bill and serve someone else.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {bills.map((bill) => {
              const totals = calculateBillTotals({
                items: bill.lines.map((line) => ({
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  lineDiscount: line.lineDiscount,
                })),
                discountAmount: bill.discountAmount,
              });

              return (
                <li
                  key={bill.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-3 bg-gray-1 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-custom-sm font-medium text-dark">
                      {bill.label}
                    </p>
                    <p className="text-custom-xs text-body">
                      {bill.lines.length} item{bill.lines.length > 1 ? "s" : ""} ·{" "}
                      {new Date(bill.savedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-custom-sm font-semibold tabular-nums text-dark">
                    {formatPrice(totals.totalAmount)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onResume(bill.id);
                      onClose();
                    }}
                    className="bg-blue hover:bg-blue-dark"
                  >
                    Resume
                  </Button>
                  <button
                    type="button"
                    onClick={() => onDiscard(bill.id)}
                    className="rounded-lg p-2 text-body transition hover:bg-red-light-6 hover:text-red"
                    aria-label={`Discard ${bill.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default HeldBillsDialog;
