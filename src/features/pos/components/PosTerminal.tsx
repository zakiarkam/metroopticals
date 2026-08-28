"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/lib/utils/toast";
import { createSale } from "@/features/pos/api/pos-api";
import { usePosCart } from "@/features/pos/hooks/use-pos-cart";
import PosProductPanel from "@/features/pos/components/PosProductPanel";
import PosBillPanel from "@/features/pos/components/PosBillPanel";
import PaymentDialog, {
  type PaymentSplit,
} from "@/features/pos/components/dialogs/PaymentDialog";
import CustomItemDialog from "@/features/pos/components/dialogs/CustomItemDialog";
import HeldBillsDialog from "@/features/pos/components/dialogs/HeldBillsDialog";
import type { PosProduct } from "@/features/pos/types/pos";

/**
 * The counter screen.
 *
 * Two panels: what the shop sells on the left, the bill being written on the
 * right. The cashier's hands stay on the keyboard  F2 returns to the search
 * box, F4 parks the bill, F9 takes payment  because at a counter the mouse is
 * the slow way to do everything.
 */
const PosTerminal: React.FC = () => {
  const router = useRouter();
  const cart = usePosCart();
  const searchRef = useRef<HTMLInputElement>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { lines, totals } = cart;

  const handlePick = useCallback(
    (product: PosProduct, color?: string | null) => {
      const result = cart.addProduct(product, color);
      if (!result.ok) {
        Toast.error(result.message || "That item cannot be added");
        return false;
      }
      return true;
    },
    [cart],
  );

  const openPayment = useCallback(() => {
    if (lines.length === 0) {
      Toast.info("Add something to the bill first");
      return;
    }
    setPaymentOpen(true);
  }, [lines.length]);

  const handleHold = useCallback(() => {
    const held = cart.holdBill();
    if (held) {
      Toast.success("Bill held. Start a new one.");
      searchRef.current?.focus();
    }
  }, [cart]);

  // Counter shortcuts. Ignored while a text field has focus except for the
  // function keys, which never type anything.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key === "F4") {
        event.preventDefault();
        handleHold();
        return;
      }
      if (event.key === "F9") {
        event.preventDefault();
        openPayment();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleHold, openPayment]);

  const handleConfirm = async ({
    payments,
    collectLater,
    balanceDueDate,
  }: {
    payments: PaymentSplit[];
    collectLater: boolean;
    balanceDueDate?: string;
  }) => {
    setSubmitting(true);
    try {
      const sale = await createSale({
        items: cart.lines.map((line) => ({
          productId: line.productId ?? undefined,
          title: line.productId == null ? line.title : undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineDiscount: line.lineDiscount,
          color: line.color ?? undefined,
        })),
        discountAmount: cart.discountAmount,
        payments: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
        })),
        customer:
          cart.customer.name.trim() || cart.customer.phone.trim()
            ? {
                id: cart.customer.id ?? undefined,
                name: cart.customer.name.trim() || undefined,
                phone: cart.customer.phone.trim() || undefined,
                email: cart.customer.email.trim() || undefined,
                address: cart.customer.address.trim() || undefined,
                city: cart.customer.city.trim() || undefined,
                saveToBook: cart.customer.saveToBook,
                marketingOptIn: cart.customer.saveToBook && cart.customer.marketingOptIn,
              }
            : undefined,
        notes: cart.notes.trim() || undefined,
        collectLater,
        balanceDueDate,
      });

      cart.clearBill();
      setPaymentOpen(false);
      Toast.success(`Bill ${sale.orderNumber} saved`);
      // Straight to the printable bill, which prints itself on arrival.
      router.push(`/admin/pos/receipt/${sale.id}?print=1`);
    } catch (error: any) {
      Toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "The bill could not be saved. Nothing was charged  try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // The admin header is a fixed 72px, so the till fills exactly what is left:
    // both panels scroll inside themselves and the page itself never does.
    <div className="flex h-[calc(100vh-72px)] flex-col gap-4 p-4 sm:p-5">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <PosProductPanel
          onPick={handlePick}
          onAddCustomItem={() => setCustomItemOpen(true)}
          quantityOnBill={cart.quantityOnBill}
          searchRef={searchRef}
        />

        <PosBillPanel
          cart={cart}
          heldCount={cart.heldBills.length}
          onHold={handleHold}
          onOpenHeld={() => setHeldOpen(true)}
          onCheckout={openPayment}
        />
      </div>

      <PaymentDialog
        open={paymentOpen}
        totalAmount={totals.totalAmount}
        hasCustomer={
          !!cart.customer.name.trim() && !!cart.customer.phone.trim()
        }
        submitting={submitting}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handleConfirm}
      />

      <CustomItemDialog
        open={customItemOpen}
        onClose={() => setCustomItemOpen(false)}
        onAdd={cart.addCustomLine}
      />

      <HeldBillsDialog
        open={heldOpen}
        bills={cart.heldBills}
        onClose={() => setHeldOpen(false)}
        onResume={cart.resumeBill}
        onDiscard={cart.discardHeldBill}
      />
    </div>
  );
};

export default PosTerminal;
