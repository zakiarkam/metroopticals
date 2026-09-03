"use client";

import React, { useState } from "react";
import { Eye, Glasses, Pencil } from "lucide-react";

import LensPickerDialog, {
  type LensSelection,
} from "@/features/lenses/components/checkout/LensPickerDialog";
import { useCart } from "@/features/cart/hooks/use-cart";
import { formatPrice } from "@/lib/utils/price";

export type LensLineItem = {
  id: number;
  title: string;
  discountedPrice: number;
  lens?: {
    lensTypeId: number;
    lensTypeName: string;
    designId: number | null;
    designName: string | null;
    tintId: number | null;
    tintName: string | null;
    tintHex: string | null;
    prescriptionId: number | null;
    prescriptionLabel: string | null;
    prescriptionVersion: number | null;
    summary: string | null;
    price: number;
  } | null;
};

/**
 * The lens control for one basket line — choose lenses, change them, take
 * them off.
 *
 * One component in two shapes rather than two components: the cart row has
 * space for the prescription and the price, the checkout's 400px summary
 * column does not. Splitting them would mean fixing every bug twice, and this
 * control is the one place a customer commits to a pair of lenses.
 *
 * It is on the checkout at all because the cart is not the only way to reach
 * it. A shopper who adds a frame from a card or a slider and goes straight to
 * paying would otherwise never be offered lenses, and would find out their new
 * glasses have no prescription in them when they arrived.
 */
export default function LensLineButton({
  item,
  disabled = false,
  variant = "compact",
}: {
  item: LensLineItem;
  disabled?: boolean;
  /** `full` is the cart row; `compact` is the checkout's narrow column. */
  variant?: "full" | "compact";
}) {
  const { setLens } = useCart();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    return ok;
  };

  const dialog = (
    <LensPickerDialog
      open={open}
      onOpenChange={setOpen}
      frameTitle={item.title}
      framePrice={item.discountedPrice}
      initial={
        item.lens
          ? {
              lensTypeId: item.lens.lensTypeId,
              lensDesignId: item.lens.designId,
              lensTintId: item.lens.tintId,
              prescriptionId: item.lens.prescriptionId,
            }
          : null
      }
      onConfirm={(selection: LensSelection) =>
        run(() => setLens(item.id, selection))
      }
      onRemove={
        item.lens
          ? () => run(() => setLens(item.id, { lensTypeId: null }))
          : undefined
      }
    />
  );

  if (variant === "full") {
    return (
      <>
        {item.lens ? (
          <div className="mt-4 rounded-xl border border-blue/25 bg-blue/[0.06] px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <Glasses className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-dark">
                    {item.lens.lensTypeName}
                    {item.lens.designName ? ` · ${item.lens.designName}` : ""}
                    {item.lens.tintName && (
                      <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-[12px] font-semibold text-dark-4">
                        <span
                          aria-hidden
                          className="h-3 w-3 rounded-full ring-1 ring-inset ring-dark/15"
                          style={{ background: item.lens.tintHex ?? "#d1d5db" }}
                        />
                        {item.lens.tintName}
                      </span>
                    )}
                  </p>

                  {item.lens.summary && (
                    <p className="mt-1 break-words font-mono text-[11.5px] leading-relaxed text-dark-4">
                      {item.lens.summary}
                    </p>
                  )}

                  {item.lens.prescriptionLabel && (
                    <p className="mt-1 text-[11px] text-dark-5">
                      {item.lens.prescriptionLabel}
                      {(item.lens.prescriptionVersion ?? 1) > 1
                        ? ` · version ${item.lens.prescriptionVersion}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[13.5px] font-bold text-dark">
                  {formatPrice(item.lens.price)}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  disabled={disabled || busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-3 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-dark-3 transition-colors hover:border-blue hover:text-blue disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Change
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={disabled || busy}
            className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-gray-4 px-4 py-3 text-left transition-colors hover:border-blue hover:bg-blue/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eye className="h-4 w-4 shrink-0 text-blue" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-dark">
                Add prescription lenses
              </span>
              <span className="block text-[11.5px] text-dark-5">
                Choose your lens, add your prescription, and see the price
                before you pay.
              </span>
            </span>
          </button>
        )}

        {dialog}
      </>
    );
  }

  return (
    <>
      {item.lens ? (
        <div className="mt-2 rounded-lg border border-blue/25 bg-blue/[0.06] px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="flex min-w-0 items-start gap-1.5 text-[11.5px] font-semibold text-dark">
              <Glasses className="mt-px h-3.5 w-3.5 shrink-0 text-blue" />
              <span className="min-w-0">
                {item.lens.lensTypeName}
                {item.lens.designName ? ` · ${item.lens.designName}` : ""}
                {item.lens.tintName ? ` · ${item.lens.tintName}` : ""}
                <span className="ml-1.5 font-bold">
                  {formatPrice(item.lens.price)}
                </span>
              </span>
            </p>

            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={disabled || busy}
              className="shrink-0 text-[11px] font-semibold text-blue underline underline-offset-2 disabled:opacity-50"
            >
              Change
            </button>
          </div>

          {item.lens.summary && (
            <p className="mt-1 break-words font-mono text-[10.5px] leading-relaxed text-dark-5">
              {item.lens.summary}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled || busy}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-4 px-3 py-2 text-left transition-colors hover:border-blue hover:bg-blue/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eye className="h-3.5 w-3.5 shrink-0 text-blue" />
          <span className="text-[11.5px] font-semibold text-dark">
            Add prescription lenses
          </span>
        </button>
      )}

      {dialog}
    </>
  );
}
