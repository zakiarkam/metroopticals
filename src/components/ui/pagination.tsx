"use client";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTruncatedPageNumbers } from "@/lib/utils/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
  className?: string;
  maxPagesToShow?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  itemsPerPageOptions = [12, 24, 48, 96],
  className = "",
  maxPagesToShow = 5,
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages);
  const hasItems = totalItems > 0;

  const startItem = hasItems ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = hasItems
    ? Math.min(safeCurrentPage * itemsPerPage, totalItems)
    : 0;

  const handlePrevious = () => {
    if (safeCurrentPage > 1) {
      onPageChange(safeCurrentPage - 1);
    }
  };

  const handleNext = () => {
    if (safeCurrentPage < safeTotalPages) {
      onPageChange(safeCurrentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  const pages = getTruncatedPageNumbers({
    currentPage: safeCurrentPage,
    totalPages: safeTotalPages,
    maxPagesToShow,
  });

  if (safeTotalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div
      className={`flex flex-col items-start gap-3 border-t border-gray-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}
    >
      {/* Items info and per page selector */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs sm:text-custom-sm text-body">
          Showing {startItem} to {endItem} of {totalItems} items
        </p>

        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="items-per-page"
              className="text-xs sm:text-custom-sm text-body"
            >
              Per page:
            </label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[68px] text-xs sm:h-9 sm:w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {safeTotalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Previous button */}
          <button
            onClick={handlePrevious}
            disabled={safeCurrentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-3 text-xs font-medium text-dark hover:bg-gray-1 disabled:opacity-50 disabled:cursor-not-allowed transition sm:h-9 sm:w-9"
            aria-label="Previous page"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6l-6 6 6 6"
              />
            </svg>
          </button>

          {/* Page numbers */}
          <div className="flex flex-wrap items-center gap-1">
            {pages.map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 py-1 text-xs text-body sm:px-3 sm:py-2 sm:text-custom-sm"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageClick(page as number)}
                  className={`min-w-[32px] rounded-md px-2 py-1 text-xs font-medium transition sm:min-w-[40px] sm:rounded-lg sm:px-3 sm:py-2 sm:text-custom-sm ${
                    safeCurrentPage === page
                      ? "bg-blue text-white"
                      : "text-dark hover:bg-gray-1"
                  }`}
                  aria-label={`Page ${page}`}
                  aria-current={safeCurrentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={safeCurrentPage === safeTotalPages}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-3 text-xs font-medium text-dark hover:bg-gray-1 disabled:opacity-50 disabled:cursor-not-allowed transition sm:h-9 sm:w-9"
            aria-label="Next page"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 6l6 6-6 6"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
