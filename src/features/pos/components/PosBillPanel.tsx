"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Minus,
  PauseCircle,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Toast } from "@/lib/utils/toast";
import { formatPrice } from "@/lib/utils/price";
import { findCustomerByPhone, getCustomers } from "@/features/pos/api/pos-api";
import type { PosCustomer } from "@/features/pos/types/pos";
import type { PosCart } from "@/features/pos/hooks/use-pos-cart";
import { lineNet } from "@/features/pos/utils/bill";

type PosBillPanelProps = {
  cart: PosCart;
  heldCount: number;
  onHold: () => void;
  onOpenHeld: () => void;
  onCheckout: () => void;
};

const PosBillPanel: React.FC<PosBillPanelProps> = ({
  cart,
  heldCount,
  onHold,
  onOpenHeld,
  onCheckout,
}) => {
  const {
    lines,
    customer,
    setCustomer,
    discountAmount,
    setDiscountAmount,
    notes,
    setNotes,
    totals,
    updateLine,
    removeLine,
    clearBill,
  } = cart;

  const [lookupState, setLookupState] = useState<"idle" | "searching" | "found" | "new">(
    "idle",
  );
  const lookupRef = useRef<AbortController | null>(null);

  // Typing a few letters of a name offers the matching people from the book,
  // so a regular customer is picked rather than re-typed  and the phone
  // number, address and consent come with them.
  const [suggestions, setSuggestions] = useState<PosCustomer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = customer.name.trim();
    if (customer.id || term.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      suggestRef.current?.abort();
      const controller = new AbortController();
      suggestRef.current = controller;
      try {
        const result = await getCustomers({ search: term, limit: 6 });
        if (!controller.signal.aborted) {
          setSuggestions(result.customers);
          setShowSuggestions(true);
        }
      } catch {
        /* suggestions are a convenience; the form still works without them */
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customer.name, customer.id]);

  const pickCustomer = (found: PosCustomer) => {
    setCustomer((current) => ({
      ...current,
      id: found.id,
      name: found.name,
      phone: found.phone,
      email: found.email || "",
      address: found.address || "",
      city: found.city || "",
      saveToBook: true,
      marketingOptIn: !!found.marketingOptIn,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setLookupState("found");
  };

  // Typing a phone number pulls the customer up: at a counter nobody wants to
  // re-type an address they gave last month.
  useEffect(() => {
    const digits = customer.phone.replace(/\D/g, "");
    if (digits.length < 7) {
      setLookupState("idle");
      return;
    }

    const timer = setTimeout(async () => {
      lookupRef.current?.abort();
      const controller = new AbortController();
      lookupRef.current = controller;
      setLookupState("searching");

      try {
        const found = await findCustomerByPhone(customer.phone, controller.signal);
        if (controller.signal.aborted) return;

        if (found) {
          setCustomer((current) => ({
            ...current,
            id: found.id,
            // What the cashier already typed wins; the record fills the gaps.
            name: current.name.trim() || found.name,
            email: current.email.trim() || found.email || "",
            address: current.address.trim() || found.address || "",
            city: current.city.trim() || found.city || "",
            saveToBook: true,
            marketingOptIn: current.marketingOptIn || !!found.marketingOptIn,
          }));
          setLookupState("found");
        } else {
          setCustomer((current) => ({ ...current, id: null }));
          setLookupState("new");
        }
      } catch (error: any) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
        setLookupState("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [customer.phone, setCustomer]);

  const handleClear = () => {
    if (lines.length === 0) return;
    if (!window.confirm("Clear this bill and start again?")) return;
    clearBill();
    Toast.info("Bill cleared");
  };

  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-gray-3 bg-gray-2 shadow-1">
      {/* ---------------------------------------------------------- customer */}
      <div className="border-b border-gray-3 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-custom-sm font-semibold text-dark">
            <UserRound className="h-4 w-4 text-blue" />
            Customer
          </h2>
          {lookupState === "found" && (
            <span className="rounded-full border border-green/20 bg-green-light-6 px-2 py-0.5 text-[11px] font-medium text-green">
              Saved customer
            </span>
          )}
          {lookupState === "new" && (
            <span className="rounded-full border border-blue/20 bg-blue-light-5 px-2 py-0.5 text-[11px] font-medium text-blue">
              Will be saved
            </span>
          )}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            value={customer.phone}
            onChange={(event) =>
              setCustomer((current) => ({ ...current, phone: event.target.value }))
            }
            placeholder="Phone"
            inputMode="tel"
            className="h-9 text-custom-sm"
            aria-label="Customer phone"
          />
          <div className="relative">
            <Input
              value={customer.name}
              onChange={(event) =>
                setCustomer((current) => ({
                  ...current,
                  // Editing the name after a pick means a different person.
                  id: current.id && event.target.value !== current.name ? null : current.id,
                  name: event.target.value,
                }))
              }
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Name"
              className="h-9 text-custom-sm"
              aria-label="Customer name"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-3 bg-gray-2 py-1 shadow-3"
              >
                <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-dark-5">
                  In the customer book
                </li>
                {suggestions.map((found) => (
                  <li key={found.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickCustomer(found)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-blue-light-5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-custom-sm font-medium text-dark">
                          {found.name}
                        </span>
                        <span className="block truncate text-custom-xs text-body">
                          {found.phone}
                          {found.city ? ` · ${found.city}` : ""}
                        </span>
                      </span>
                      {found.stats && found.stats.bills > 0 && (
                        <span className="shrink-0 text-custom-xs text-body">
                          {found.stats.bills} bill{found.stats.bills === 1 ? "" : "s"}
                        </span>
                      )}
                      {found.stats && found.stats.owed > 0 && (
                        <span className="shrink-0 rounded-full border border-red/20 bg-red-light-6 px-2 py-0.5 text-[10px] font-medium text-red">
                          owes {formatPrice(found.stats.owed)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Kept in the book, and may we tell them about offers  two separate
            questions, because a number given to chase a bill is not permission
            to market to it. Only shown once there is someone to ask. */}
        {(customer.phone.trim() || customer.name.trim()) && (
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            <label className="flex items-center gap-1.5 text-custom-xs text-dark">
              <input
                type="checkbox"
                checked={customer.saveToBook}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    saveToBook: event.target.checked,
                    marketingOptIn: event.target.checked && current.marketingOptIn,
                  }))
                }
                className="h-3.5 w-3.5 rounded border-gray-4 text-blue focus:ring-blue"
              />
              Keep in customer book
            </label>
            <label
              className={`flex items-center gap-1.5 text-custom-xs ${
                customer.saveToBook ? "text-dark" : "text-dark-5"
              }`}
            >
              <input
                type="checkbox"
                checked={customer.marketingOptIn}
                disabled={!customer.saveToBook}
                onChange={(event) =>
                  setCustomer((current) => ({
                    ...current,
                    marketingOptIn: event.target.checked,
                  }))
                }
                className="h-3.5 w-3.5 rounded border-gray-4 text-blue focus:ring-blue disabled:opacity-40"
              />
              OK to send offers
            </label>
          </div>
        )}

        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-custom-xs font-medium text-blue underline-offset-2 hover:underline">
            Address &amp; email (optional)
          </summary>
          <div className="mt-2 grid gap-2">
            <Input
              value={customer.email}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="Email"
              type="email"
              className="h-9 text-custom-sm"
              aria-label="Customer email"
            />
            <Input
              value={customer.address}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="Address"
              className="h-9 text-custom-sm"
              aria-label="Customer address"
            />
            <Input
              value={customer.city}
              onChange={(event) =>
                setCustomer((current) => ({ ...current, city: event.target.value }))
              }
              placeholder="City"
              className="h-9 text-custom-sm"
              aria-label="Customer city"
            />
          </div>
        </details>
      </div>

      {/* ------------------------------------------------------------- lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center">
            <ReceiptText className="h-7 w-7 text-gray-4" />
            <p className="text-custom-sm font-medium text-dark">No items yet</p>
            <p className="text-custom-xs text-body">
              Search or scan on the left to start the bill.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((line) => {
              const net = lineNet(line);
              const overridden = line.unitPrice !== line.catalogueUnitPrice;

              return (
                <li
                  key={line.key}
                  className="rounded-lg border border-gray-3 bg-gray-1 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-custom-sm font-medium text-dark">
                        {line.title}
                      </p>
                      <p className="text-custom-xs text-body">
                        {line.color ? `${line.color} · ` : ""}
                        {line.productId == null ? "Service" : line.sku || "In catalogue"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="rounded-md p-1.5 text-body transition hover:bg-red-light-6 hover:text-red"
                      aria-label={`Remove ${line.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg border border-gray-3 bg-gray-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(line.key, { quantity: line.quantity - 1 })
                        }
                        disabled={line.quantity <= 1}
                        className="p-1.5 text-body transition hover:text-blue disabled:opacity-40"
                        aria-label="One less"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.key, {
                            quantity: Number(event.target.value.replace(/\D/g, "")) || 1,
                          })
                        }
                        className="w-9 border-0 bg-transparent p-0 text-center text-custom-sm font-semibold text-dark focus:outline-none"
                        inputMode="numeric"
                        aria-label={`Quantity of ${line.title}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(line.key, { quantity: line.quantity + 1 })
                        }
                        disabled={
                          line.availableStock != null &&
                          line.quantity >= line.availableStock
                        }
                        className="p-1.5 text-body transition hover:text-blue disabled:opacity-40"
                        aria-label="One more"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <label className="flex items-center gap-1 text-custom-xs text-body">
                      <span className="sr-only">Unit price</span>
                      <span aria-hidden="true">Rs</span>
                      <input
                        value={line.unitPrice}
                        onChange={(event) =>
                          updateLine(line.key, {
                            unitPrice: Number(event.target.value) || 0,
                          })
                        }
                        type="number"
                        min={0}
                        step="0.01"
                        className={`h-8 w-24 rounded-lg border bg-gray-2 px-2 text-right text-custom-sm font-medium tabular-nums focus:outline-none focus:ring-1 focus:ring-blue ${
                          overridden
                            ? "border-blue/40 text-blue"
                            : "border-gray-3 text-dark"
                        }`}
                        aria-label={`Unit price of ${line.title}`}
                      />
                    </label>

                    <span className="ml-auto text-custom-sm font-semibold tabular-nums text-dark">
                      {formatPrice(net)}
                    </span>
                  </div>

                  {overridden && (
                    <p className="mt-1.5 text-[11px] text-blue">
                      Price changed from {formatPrice(line.catalogueUnitPrice)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------------ totals */}
      <div className="border-t border-gray-3 px-4 py-3 sm:px-5">
        <dl className="flex flex-col gap-1.5 text-custom-sm">
          <div className="flex items-center justify-between text-body">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
          </div>

          <div className="flex items-center justify-between gap-3 text-body">
            <dt>Discount</dt>
            <dd className="flex items-center gap-1">
              <span className="text-custom-xs" aria-hidden="true">
                Rs
              </span>
              <input
                value={discountAmount || ""}
                onChange={(event) =>
                  setDiscountAmount(Math.max(0, Number(event.target.value) || 0))
                }
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="h-8 w-24 rounded-lg border border-gray-3 bg-gray-1 px-2 text-right text-custom-sm font-medium tabular-nums text-dark focus:outline-none focus:ring-1 focus:ring-blue"
                aria-label="Discount on the whole bill"
              />
            </dd>
          </div>

          <div className="mt-1 flex items-baseline justify-between border-t border-gray-3 pt-2">
            <dt className="text-custom-sm font-semibold text-dark">Total</dt>
            <dd className="text-custom-xl font-semibold tabular-nums text-dark">
              {formatPrice(totals.totalAmount)}
            </dd>
          </div>
        </dl>

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Note on the bill (optional)"
          className="mt-3 h-9 w-full rounded-lg border border-gray-3 bg-gray-1 px-3 text-custom-sm text-dark placeholder:text-dark-5 focus:outline-none focus:ring-1 focus:ring-blue"
          aria-label="Note on the bill"
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={lines.length === 0}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-gray-1 text-custom-xs font-medium text-dark transition hover:bg-gray-3 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={lines.length === 0 ? onOpenHeld : onHold}
            className="relative flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-gray-1 text-custom-xs font-medium text-dark transition hover:bg-gray-3"
          >
            <PauseCircle className="h-4 w-4" />
            {lines.length === 0 ? "Held" : "Hold"}
            {heldCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-blue px-1.5 text-[10px] font-semibold text-white">
                {heldCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={lines.length === 0}
            className="flex h-10 items-center justify-center rounded-lg bg-blue text-custom-xs font-semibold text-white transition hover:bg-blue-dark disabled:opacity-40"
          >
            Payment · F9
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PosBillPanel;
