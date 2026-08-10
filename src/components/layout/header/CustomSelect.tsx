"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = { label: string; value: string };
type CustomSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CustomSelect({
  options,
  value,
  onChange,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? options[0],
    [options, value]
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="
          flex h-full items-center gap-2 px-3 sm:px-4
          text-sm font-medium text-dark
          bg-gray-1 hover:bg-gray-50
          min-w-[140px] sm:min-w-[170px]
        "
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="line-clamp-1">{selected?.label ?? "Select"}</span>
        <span className="ml-auto text-dark/70">
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && (
        <div
          className="
            absolute left-0 top-full mt-2 z-50
            w-[min(280px,calc(100vw-16px))]
            rounded-xl border border-gray-200 bg-white shadow-xl
            overflow-hidden
          "
          role="listbox"
        >
          <div className="max-h-64 overflow-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (opt.value !== value) {
                      onChange(opt.value);
                    }
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                    active ? "text-blue bg-blue-light-5/40 font-medium" : "text-dark"
                  }`}
                  role="option"
                  aria-selected={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
