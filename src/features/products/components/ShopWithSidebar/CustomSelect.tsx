"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Sort control for the shop toolbar. Custom rather than a native `<select>` so the popup matches the dark theme on every platform. */
const CustomSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select option",
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-10 min-w-[150px] items-center justify-between gap-3 rounded-lg border bg-gray-1 px-4 text-[13px] font-medium text-dark transition-colors sm:min-w-[210px] ${
          isOpen ? "border-blue" : "border-gray-3 hover:border-blue/60"
        }`}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-dark-4 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-3 bg-gray-8 p-1.5 shadow-3"
        >
          {options.map((option) => {
            const active = value === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-blue/15 font-semibold text-blue"
                      : "text-dark hover:bg-gray-2"
                  }`}
                >
                  {option.label}
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
