"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CartCustomerDraft,
  CartLine,
  CartPaymentDraft,
  PaymentMethod,
  PosProduct,
} from "@/features/pos/types/pos";
import { calculateBillTotals } from "@/features/pos/utils/bill";

/**
 * The bill being written at the counter.
 *
 * Everything lives in this hook so the screen itself stays presentational, and
 * the whole till state is mirrored into the browser so a refresh, a crashed
 * tab or a laptop that went to sleep mid-sale does not cost the cashier a
 * half-typed bill in front of a waiting customer.
 */

const DRAFT_KEY = "metro-pos-draft-v1";
const HELD_KEY = "metro-pos-held-v1";
/** Held bills are a parking space for today, not an archive. */
const MAX_HELD_BILLS = 12;

export type HeldBill = {
  id: string;
  label: string;
  savedAt: string;
  lines: CartLine[];
  customer: CartCustomerDraft;
  discountAmount: number;
  notes: string;
  collectLater: boolean;
};

export const emptyCustomer = (): CartCustomerDraft => ({
  id: null,
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  saveToBook: true,
  marketingOptIn: false,
});

const newKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** The price the catalogue is asking for this product today. */
export const catalogueUnitPrice = (product: PosProduct): number =>
  product.discountedPrice != null && product.discountedPrice < product.price
    ? product.discountedPrice
    : product.price;

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // A corrupted or blocked store must never stop the till from opening.
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing, quota  the bill still works, it just is not parked */
  }
};

export function usePosCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CartCustomerDraft>(emptyCustomer);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [collectLater, setCollectLater] = useState(false);
  const [payments, setPayments] = useState<CartPaymentDraft[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [restored, setRestored] = useState(false);

  // Restore the parked draft once, on the client only.
  useEffect(() => {
    const draft = readStorage<Partial<HeldBill> | null>(DRAFT_KEY, null);
    if (draft?.lines?.length) {
      setLines(draft.lines);
      setCustomer({ ...emptyCustomer(), ...(draft.customer || {}) });
      setDiscountAmount(draft.discountAmount || 0);
      setNotes(draft.notes || "");
      setCollectLater(!!draft.collectLater);
    }
    setHeldBills(readStorage<HeldBill[]>(HELD_KEY, []));
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    if (lines.length === 0) {
      writeStorage(DRAFT_KEY, null);
      return;
    }
    writeStorage(DRAFT_KEY, {
      lines,
      customer,
      discountAmount,
      notes,
      collectLater,
    });
  }, [restored, lines, customer, discountAmount, notes, collectLater]);

  useEffect(() => {
    if (!restored) return;
    writeStorage(HELD_KEY, heldBills);
  }, [restored, heldBills]);

  const totals = useMemo(
    () =>
      calculateBillTotals({
        items: lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineDiscount: line.lineDiscount,
        })),
        discountAmount,
        amountPaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
      }),
    [lines, discountAmount, payments],
  );

  /** How many of a product are already on the bill, across its colourways. */
  const quantityOnBill = useCallback(
    (productId: number) =>
      lines
        .filter((line) => line.productId === productId)
        .reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const addProduct = useCallback(
    (product: PosProduct, color?: string | null): { ok: boolean; message?: string } => {
      const unitPrice = catalogueUnitPrice(product);
      const wanted = color?.trim() || null;

      // Decided here rather than inside the state updater: the updater runs
      // when React gets round to it, so a verdict written in there would still
      // be unread when this function returns and the till would silently
      // accept a frame it does not have.
      const onBill = lines
        .filter((line) => line.productId === product.id)
        .reduce((sum, line) => sum + line.quantity, 0);

      if (onBill + 1 > product.stock) {
        return {
          ok: false,
          message:
            product.stock === 0
              ? `${product.title} is out of stock`
              : `Only ${product.stock} of ${product.title} in stock, and ${onBill} ${
                  onBill === 1 ? "is" : "are"
                } already on this bill`,
        };
      }

      setLines((current) => {
        // The same frame in the same colour stacks; a different colour is its
        // own line, because that is how it leaves the shop.
        const existing = current.find(
          (line) =>
            line.productId === product.id && (line.color || null) === wanted,
        );
        if (existing) {
          return current.map((line) =>
            line.key === existing.key
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          );
        }

        const line: CartLine = {
          key: newKey(),
          productId: product.id,
          title: product.title,
          sku: product.sku,
          image: product.images?.[0] || null,
          quantity: 1,
          catalogueUnitPrice: unitPrice,
          unitPrice,
          lineDiscount: 0,
          color: wanted,
          availableStock: product.stock,
        };
        return [...current, line];
      });

      return { ok: true };
    },
    [lines],
  );

  const addCustomLine = useCallback(
    (input: { title: string; unitPrice: number; quantity: number }) => {
      setLines((current) => [
        ...current,
        {
          key: newKey(),
          productId: null,
          title: input.title.trim(),
          quantity: Math.max(1, Math.round(input.quantity)),
          catalogueUnitPrice: input.unitPrice,
          unitPrice: input.unitPrice,
          lineDiscount: 0,
          color: null,
          availableStock: null,
        },
      ]);
    },
    [],
  );

  const updateLine = useCallback(
    (key: string, patch: Partial<Pick<CartLine, "quantity" | "unitPrice" | "lineDiscount">>) => {
      setLines((current) =>
        current.map((line) => {
          if (line.key !== key) return line;

          const next = { ...line, ...patch };
          next.quantity = Math.max(1, Math.round(next.quantity || 1));
          // Never let the till promise stock it does not have.
          if (line.availableStock != null) {
            next.quantity = Math.min(next.quantity, Math.max(1, line.availableStock));
          }
          next.unitPrice = Math.max(0, next.unitPrice || 0);
          next.lineDiscount = Math.min(
            Math.max(0, next.lineDiscount || 0),
            next.unitPrice * next.quantity,
          );
          return next;
        }),
      );
    },
    [],
  );

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearBill = useCallback(() => {
    setLines([]);
    setCustomer(emptyCustomer());
    setDiscountAmount(0);
    setNotes("");
    setCollectLater(false);
    setPayments([]);
  }, []);

  const addPayment = useCallback((method: PaymentMethod, amount: number, reference = "") => {
    setPayments((current) => [
      ...current,
      { key: newKey(), method, amount, reference },
    ]);
  }, []);

  const removePayment = useCallback((key: string) => {
    setPayments((current) => current.filter((payment) => payment.key !== key));
  }, []);

  const holdBill = useCallback(() => {
    if (lines.length === 0) return null;
    const held: HeldBill = {
      id: newKey(),
      label:
        customer.name.trim() ||
        customer.phone.trim() ||
        `${lines.length} item${lines.length > 1 ? "s" : ""}`,
      savedAt: new Date().toISOString(),
      lines,
      customer,
      discountAmount,
      notes,
      collectLater,
    };
    setHeldBills((current) => [held, ...current].slice(0, MAX_HELD_BILLS));
    clearBill();
    return held;
  }, [lines, customer, discountAmount, notes, collectLater, clearBill]);

  const resumeBill = useCallback(
    (id: string) => {
      const held = heldBills.find((bill) => bill.id === id);
      if (!held) return false;
      setLines(held.lines);
      setCustomer({ ...emptyCustomer(), ...held.customer });
      setDiscountAmount(held.discountAmount);
      setNotes(held.notes);
      setCollectLater(held.collectLater);
      setPayments([]);
      setHeldBills((current) => current.filter((bill) => bill.id !== id));
      return true;
    },
    [heldBills],
  );

  const discardHeldBill = useCallback((id: string) => {
    setHeldBills((current) => current.filter((bill) => bill.id !== id));
  }, []);

  return {
    lines,
    customer,
    setCustomer,
    discountAmount,
    setDiscountAmount,
    notes,
    setNotes,
    collectLater,
    setCollectLater,
    payments,
    addPayment,
    removePayment,
    setPayments,
    totals,
    quantityOnBill,
    addProduct,
    addCustomLine,
    updateLine,
    removeLine,
    clearBill,
    heldBills,
    holdBill,
    resumeBill,
    discardHeldBill,
  };
}

export type PosCart = ReturnType<typeof usePosCart>;
