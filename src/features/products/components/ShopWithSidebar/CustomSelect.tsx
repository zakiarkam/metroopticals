"use client";

import { useState, useRef, useEffect } from "react";

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
        className="flex items-center justify-between gap-3 min-w-[130px] sm:min-w-[200px] text-align-left px-4 py-2.5 bg-gray-2 border border-gray-3 rounded-lg text-custom-sm text-dark hover:border-blue focus:outline-none focus:border-blue"
      >
        <span>{selectedOption?.label || placeholder}</span>
        <svg
          className={`fill-current transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4.287 5.67999C4.456 5.51099 4.68533 5.41699 4.924 5.41699C5.16267 5.41699 5.392 5.51099 5.561 5.67999L8 8.11866L10.439 5.67999C10.6084 5.51794 10.836 5.42969 11.0717 5.43186C11.3073 5.43403 11.5333 5.52644 11.6996 5.69169C11.8659 5.85694 11.9597 6.08239 11.9623 6.31799C11.9648 6.55359 11.8759 6.78099 11.713 6.94999L8.637 10.027C8.468 10.196 8.23867 10.29 8 10.29C7.76133 10.29 7.532 10.196 7.363 10.027L4.287 6.94999C4.118 6.78099 4.024 6.55166 4.024 6.31299C4.024 6.07432 4.118 5.84499 4.287 5.67599V5.67999Z"
            fill=""
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-gray-2 border border-gray-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-custom-sm hover:bg-gray-1 transition-colors ${
                value === option.value
                  ? "bg-blue-light text-blue font-medium"
                  : "text-dark"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
