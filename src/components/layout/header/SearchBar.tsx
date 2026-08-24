"use client";

import React, { memo } from "react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
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
  searchQuery,
  setSearchQuery,
  onSubmit,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="w-full" role="search">
      <div className="relative flex w-full items-center rounded-full border border-gray-3 bg-gray-1 transition-colors focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/25">
        <button
          aria-label="Search"
          type="submit"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-4 transition-colors hover:text-blue"
        >
          <IconSearch />
        </button>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type="search"
          placeholder="I'm looking for..."
          autoComplete="off"
          aria-label="Search products"
          className="w-full rounded-full bg-transparent py-2.5 pl-12 pr-5 focus:outline-none"
        />
      </div>
    </form>
  );
});

export default SearchBar;
