"use client";

import React, { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchBarProps {
  options: { label: string; value: string }[];
  selectedCategory: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCategorySelect: (v: string) => void;
}

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SearchBar = memo(function SearchBar({
  options,
  selectedCategory,
  searchQuery,
  setSearchQuery,
  onSubmit,
  onCategorySelect,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex w-full items-stretch rounded-lg border border-gray-3 bg-gray-1 overflow-visible">
        <div className="min-w-[140px] sm:min-w-[170px]">
          <Select value={selectedCategory} onValueChange={onCategorySelect}>
            <SelectTrigger className="h-full rounded-none rounded-l-lg border-0 bg-gray-1 hover:bg-gray-50 text-sm font-medium text-dark focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="max-w-[280px]">
              {options.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-sm cursor-pointer"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex min-w-0 flex-1 items-center">
          <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-px bg-gray-4" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="search"
            placeholder="I am shopping for..."
            autoComplete="off"
            className="w-full bg-transparent py-2.5 pl-4 pr-10 outline-none"
          />
          <button
            aria-label="Search"
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/70 hover:text-blue transition-colors"
          >
            <IconSearch />
          </button>
        </div>
      </div>
    </form>
  );
});

export default SearchBar;
