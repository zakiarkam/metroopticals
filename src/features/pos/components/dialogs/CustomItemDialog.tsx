"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
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

type CustomItemDialogProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { title: string; unitPrice: number; quantity: number }) => void;
};

/** Work the shop does that is not a catalogue product. */
const SUGGESTIONS = ["Eye test", "Lens fitting", "Frame repair", "Lens cleaning"];

const CustomItemDialog: React.FC<CustomItemDialogProps> = ({
  open,
  onClose,
  onAdd,
}) => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPrice("");
    setQuantity("1");
    setError("");
  }, [open]);

  const submit = () => {
    const name = title.trim();
    const unitPrice = Number(price);

    if (!name) {
      setError("Give the item a name so it reads clearly on the bill");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Enter a price");
      return;
    }

    onAdd({
      title: name,
      unitPrice,
      quantity: Math.max(1, Number(quantity) || 1),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="flex max-w-md flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-gray-3 bg-gray-2 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Service or custom item</DialogTitle>
              <DialogDescription>
                Something the shop charges for that is not in the catalogue. It
                does not touch stock.
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
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-custom-sm font-medium text-dark">
                What is it <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Eye test"
                className="w-full"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className="rounded-full border border-gray-3 bg-gray-1 px-3 py-1 text-custom-xs font-medium text-dark transition hover:border-blue/30 hover:text-blue"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Price (Rs) <span className="text-destructive">*</span>
                </label>
                <Input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="text-right tabular-nums"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submit();
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Quantity
                </label>
                <Input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  min={1}
                  className="text-right tabular-nums"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red bg-red-light-6 p-3">
                <p className="text-custom-sm text-red">{error}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-gray-3 bg-gray-2 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} className="bg-blue hover:bg-blue-dark">
            Add to bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomItemDialog;
