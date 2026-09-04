"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

import { formatDiopter } from "@/features/lenses/constants/optics";

/**
 * One cell of the prescription grid.
 *
 * A select rather than a text input on purpose: every legal power is a
 * quarter-dioptre step off a known list, and a dropdown makes "-2.30" - which
 * is not a lens anybody can grind - impossible to enter rather than merely
 * rejected after the fact.
 */
export default function PowerSelect({
  id,
  label,
  value,
  options,
  onChange,
  format = formatDiopter,
  placeholder = "-",
  disabled = false,
  error,
  highlighted = false,
  allowEmpty = true,
}: {
  id: string;
  label: string;
  value: number | null;
  options: number[];
  onChange: (next: number | null) => void;
  format?: (value: number | null) => string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** Marks a value that came off a photo and wants a second look. */
  highlighted?: boolean;
  allowEmpty?: boolean;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <select
        id={id}
        value={value === null ? "" : String(value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : Number(event.target.value),
          )
        }
        className={`h-11 w-full cursor-pointer appearance-none rounded-lg border bg-white px-1.5 pr-6 text-center text-[13px] font-semibold text-dark outline-none transition-colors disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 sm:px-3 sm:pr-8 sm:text-[14px] ${
          error
            ? "border-red"
            : highlighted
              ? "border-blue bg-blue/[0.06]"
              : "border-gray-3 hover:border-gray-4 focus:border-blue"
        }`}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>

      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 sm:right-2.5 ${
          disabled ? "text-gray-4" : "text-blue"
        }`}
      />
    </div>
  );
}
