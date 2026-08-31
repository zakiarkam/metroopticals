"use client";
import React, { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  incrementProductStock,
  decrementProductStock,
} from "@/features/products/api/product-api";
import { Toast } from "@/lib/utils/toast";

/** Sentinel for "no specific colour" — Radix Select forbids an empty value. */
const NO_COLOR = "__none__";

interface StockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId: number | null;
  productName: string;
  currentStock: number;
  /** The product's colourways, so units land on the right colour. */
  frameColors?: string[];
  /** Per-colour rows; a null stock means the colour is not counted yet. */
  colorStocks?: { color: string; stock: number | null }[];
  type: "increment" | "decrement";
}

const StockDialog: React.FC<StockDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  productName,
  currentStock,
  frameColors = [],
  colorStocks = [],
  type,
}) => {
  const [count, setCount] = useState(1);
  const [color, setColor] = useState<string>(NO_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = frameColors.map((c) => c.trim()).filter(Boolean);

  // Units belong to a colourway whenever the product has them, so the first
  // colour is pre-selected rather than the untracked bucket.
  useEffect(() => {
    if (isOpen) setColor(colors[0] ?? NO_COLOR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId]);

  const countFor = (colorName: string) =>
    colorStocks.find(
      (row) => row.color.trim().toLowerCase() === colorName.toLowerCase(),
    )?.stock;

  const selectedColor = color === NO_COLOR ? undefined : color;
  const selectedColorCount = selectedColor ? countFor(selectedColor) : undefined;

  // Removing stock is bounded by whichever count is being spent: the
  // colourway's when one is recorded, the total otherwise.
  const removalCeiling =
    type === "decrement"
      ? selectedColorCount != null
        ? Math.min(selectedColorCount, currentStock)
        : currentStock
      : null;

  const handleSubmit = async () => {
    if (!productId || count <= 0) {
      Toast.error("Please enter a valid quantity");
      return;
    }

    if (removalCeiling != null && count > removalCeiling) {
      Toast.error(
        selectedColor && selectedColorCount != null
          ? `Only ${removalCeiling} of the ${selectedColor} colour to remove`
          : `Cannot remove more than ${removalCeiling} units`,
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = Toast.loading(
      `${type === "increment" ? "Adding" : "Removing"} ${count} unit${
        count > 1 ? "s" : ""
      }...`
    );

    try {
      if (type === "increment") {
        await incrementProductStock(productId, count, selectedColor);
      } else {
        await decrementProductStock(productId, count, selectedColor);
      }

      Toast.update(toastId, {
        render: `Successfully ${
          type === "increment" ? "added" : "removed"
        } ${count} unit${count > 1 ? "s" : ""}${
          selectedColor ? ` of ${selectedColor}` : ""
        }!`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
        closeButton: true,
      });

      setCount(1);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error(`Failed to ${type} stock:`, err);

      Toast.update(toastId, {
        render:
          err?.response?.data?.message ||
          err?.message ||
          `Failed to ${type} stock. Please try again.`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCount(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent hideClose className="max-w-md flex flex-col p-0 sm:p-0">
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {type === "increment" ? "Add Stock" : "Remove Stock"}
              </DialogTitle>
              <DialogDescription>
                {type === "increment"
                  ? "Increase the stock quantity for this product"
                  : "Decrease the stock quantity for this product"}
              </DialogDescription>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-dark-4 transition hover:bg-gray-1 hover:text-dark"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-custom-sm font-medium text-dark">
                Product Name
              </label>
              <p className="text-custom-sm text-body">{productName}</p>
            </div>

            <div>
              <label className="mb-2 block text-custom-sm font-medium text-dark">
                Current Stock
              </label>
              <p className="text-custom-sm font-semibold text-dark">
                {currentStock} units
                {selectedColor && selectedColorCount != null && (
                  <span className="ml-2 font-normal text-dark-4">
                    ({selectedColorCount} in {selectedColor})
                  </span>
                )}
              </p>
            </div>

            {colors.length > 0 && (
              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Colour
                </label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a colour" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((c) => {
                      const recorded = countFor(c);
                      return (
                        <SelectItem key={c} value={c}>
                          {c}
                          {recorded != null
                            ? ` — ${recorded} in stock`
                            : " — not counted yet"}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value={NO_COLOR}>
                      No specific colour
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-custom-xs text-dark-5">
                  Units are counted against the colour, so the shop can show a
                  sold-out colourway.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="quantity"
                className="mb-2 block text-custom-sm font-medium text-dark"
              >
                Quantity to {type === "increment" ? "Add" : "Remove"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={removalCeiling ?? undefined}
                value={count}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    setCount(value);
                  } else if (e.target.value === "") {
                    setCount(0);
                  }
                }}
                onFocus={(e) => {
                  if (count === 0 || count === 1) {
                    e.target.select();
                  }
                }}
                placeholder="Enter quantity"
                className="w-full"
                required
              />
            </div>

            <div className="rounded-lg bg-blue-light-5 border border-blue p-3">
              <p className="text-custom-sm text-blue">
                New stock will be:{" "}
                <span className="font-semibold">
                  {type === "increment"
                    ? currentStock + count
                    : Math.max(0, currentStock - count)}{" "}
                  units
                </span>
                {selectedColor && selectedColorCount != null && (
                  <span>
                    {" "}
                    ({selectedColor}:{" "}
                    {type === "increment"
                      ? selectedColorCount + count
                      : Math.max(0, selectedColorCount - count)}
                    )
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-2 border-t border-gray-3 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || count <= 0}
            className={type === "decrement" ? "bg-red hover:bg-red-dark" : ""}
          >
            {isSubmitting
              ? "Processing..."
              : type === "increment"
              ? "Add Stock"
              : "Remove Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockDialog;
